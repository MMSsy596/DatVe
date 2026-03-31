import crypto from "node:crypto";
import { createNonce } from "./security";

export type PaymentProvider = "MOMO" | "ZALOPAY" | "VNPAY";
export type GatewayMode = "SANDBOX" | "REAL";

type PreparedPayment = {
  providerOrderId: string;
  checkoutUrl: string;
  gatewayMode: GatewayMode;
  mode: "REAL" | "MOCK";
  requestPayload: Record<string, unknown>;
};

function hmacSha256(secret: string, raw: string) {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

function hmacSha512(secret: string, raw: string) {
  return crypto.createHmac("sha512", secret).update(raw).digest("hex");
}

function sortObject(input: Record<string, string>) {
  return Object.keys(input)
    .sort()
    .reduce<Record<string, string>>((result, key) => {
      result[key] = input[key];
      return result;
    }, {});
}

function formatVnpDate(date: Date) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ];
  return parts.join("");
}

function detectGatewayMode(value?: string | null): GatewayMode {
  return value === "REAL" ? "REAL" : "SANDBOX";
}

function getVnpConfig(mode: GatewayMode) {
  return {
    tmnCode: mode === "REAL" ? process.env.VNPAY_TMN_CODE_REAL : process.env.VNPAY_TMN_CODE_SANDBOX,
    hashSecret:
      mode === "REAL" ? process.env.VNPAY_HASH_SECRET_REAL : process.env.VNPAY_HASH_SECRET_SANDBOX,
    paymentUrl:
      mode === "REAL"
        ? process.env.VNPAY_PAYMENT_URL_REAL ?? "https://pay.vnpay.vn/vpcpay.html"
        : process.env.VNPAY_PAYMENT_URL_SANDBOX ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  };
}

export function verifyVnpayReturn(params: URLSearchParams, gatewayMode: GatewayMode) {
  const config = getVnpConfig(gatewayMode);
  if (!config.tmnCode || !config.hashSecret) {
    return false;
  }
  const secureHash = params.get("vnp_SecureHash");
  if (!secureHash) return false;
  const data: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key !== "vnp_SecureHash" && key !== "vnp_SecureHashType") {
      data[key] = value;
    }
  });
  const query = new URLSearchParams(sortObject(data)).toString();
  const expected = hmacSha512(config.hashSecret, query);
  return secureHash === expected;
}

async function buildVnpayPayment(input: {
  amount: number;
  bookingCode: string;
  providerTxnRef: string;
  origin: string;
  returnUrl: string;
  ipAddr: string;
  gatewayMode: GatewayMode;
}): Promise<PreparedPayment | null> {
  const config = getVnpConfig(input.gatewayMode);
  if (!config.tmnCode || !config.hashSecret) return null;

  const now = new Date();
  const expire = new Date(now.getTime() + 15 * 60 * 1000);
  const params = sortObject({
    vnp_Amount: String(input.amount * 100),
    vnp_Command: "pay",
    vnp_CreateDate: formatVnpDate(now),
    vnp_CurrCode: "VND",
    vnp_IpAddr: input.ipAddr,
    vnp_Locale: "vn",
    vnp_OrderInfo: `Thanh toán vé ${input.bookingCode}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: `${input.origin}/api/v1/payments/callback/vnpay`,
    vnp_TmnCode: config.tmnCode,
    vnp_TxnRef: input.providerTxnRef,
    vnp_Version: "2.1.0",
    vnp_ExpireDate: formatVnpDate(expire),
  });
  const query = new URLSearchParams(params).toString();
  const secureHash = hmacSha512(config.hashSecret, query);

  return {
    providerOrderId: input.providerTxnRef,
    checkoutUrl: `${config.paymentUrl}?${query}&vnp_SecureHash=${secureHash}`,
    gatewayMode: input.gatewayMode,
    mode: "REAL",
    requestPayload: params,
  };
}

async function buildMomoPayment(input: {
  amount: number;
  bookingCode: string;
  providerTxnRef: string;
  origin: string;
  returnUrl: string;
  gatewayMode: GatewayMode;
}) {
  const partnerCode =
    input.gatewayMode === "REAL" ? process.env.MOMO_PARTNER_CODE_REAL : process.env.MOMO_PARTNER_CODE_SANDBOX;
  const accessKey =
    input.gatewayMode === "REAL" ? process.env.MOMO_ACCESS_KEY_REAL : process.env.MOMO_ACCESS_KEY_SANDBOX;
  const secretKey =
    input.gatewayMode === "REAL" ? process.env.MOMO_SECRET_KEY_REAL : process.env.MOMO_SECRET_KEY_SANDBOX;
  const endpoint =
    input.gatewayMode === "REAL"
      ? process.env.MOMO_CREATE_URL_REAL
      : process.env.MOMO_CREATE_URL_SANDBOX ?? "https://test-payment.momo.vn/v2/gateway/api/create";

  if (!partnerCode || !accessKey || !secretKey || !endpoint) return null;

  const requestId = createNonce("momo");
  const orderId = input.providerTxnRef;
  const ipnUrl = `${input.origin}/api/v1/payments/callback/momo`;
  const redirectUrl = `${input.origin}/api/v1/payments/callback/momo`;
  const rawSignature =
    `accessKey=${accessKey}&amount=${input.amount}&extraData=` +
    `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=Thanh toán vé ${input.bookingCode}` +
    `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

  const payload = {
    partnerCode,
    requestId,
    amount: input.amount,
    orderId,
    orderInfo: `Thanh toán vé ${input.bookingCode}`,
    redirectUrl,
    ipnUrl,
    extraData: "",
    requestType: "captureWallet",
    lang: "vi",
    signature: hmacSha256(secretKey, rawSignature),
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok || !json.payUrl) {
    throw new Error(json.message ?? "MoMo không tạo được link thanh toán.");
  }

  return {
    providerOrderId: orderId,
    checkoutUrl: String(json.payUrl),
    gatewayMode: input.gatewayMode,
    mode: "REAL" as const,
    requestPayload: payload,
  };
}

async function buildZalopayPayment(input: {
  amount: number;
  bookingCode: string;
  providerTxnRef: string;
  origin: string;
  returnUrl: string;
  gatewayMode: GatewayMode;
}) {
  const appId =
    input.gatewayMode === "REAL" ? process.env.ZALOPAY_APP_ID_REAL : process.env.ZALOPAY_APP_ID_SANDBOX;
  const key1 =
    input.gatewayMode === "REAL" ? process.env.ZALOPAY_KEY1_REAL : process.env.ZALOPAY_KEY1_SANDBOX;
  const endpoint =
    input.gatewayMode === "REAL"
      ? process.env.ZALOPAY_CREATE_URL_REAL
      : process.env.ZALOPAY_CREATE_URL_SANDBOX ?? "https://sb-openapi.zalopay.vn/v2/create";

  if (!appId || !key1 || !endpoint) return null;

  const now = new Date();
  const yymmdd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const appTransId = `${yymmdd}_${Date.now()}`;
  const embedData = JSON.stringify({
    redirecturl: input.returnUrl,
    providerTxnRef: input.providerTxnRef,
    callback_url: `${input.origin}/api/v1/payments/callback/zalopay`,
  });
  const item = "[]";
  const appTime = Date.now();
  const data = `${appId}|${appTransId}|${input.bookingCode}|${input.amount}|${appTime}|${embedData}|${item}`;
  const payload = {
    app_id: Number(appId),
    app_user: input.bookingCode,
    app_time: appTime,
    amount: input.amount,
    app_trans_id: appTransId,
    embed_data: embedData,
    item,
    description: `Đặt Vé - ${input.bookingCode}`,
    callback_url: `${input.origin}/api/v1/payments/callback/zalopay`,
    mac: hmacSha256(key1, data),
  };

  const body = new URLSearchParams(
    Object.entries(payload).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {})
  );
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await response.json();
  if (!response.ok || !(json.order_url || json.orderurl)) {
    throw new Error(json.return_message ?? "ZaloPay không tạo được link thanh toán.");
  }

  return {
    providerOrderId: appTransId,
    checkoutUrl: String(json.order_url ?? json.orderurl),
    gatewayMode: input.gatewayMode,
    mode: "REAL" as const,
    requestPayload: payload,
  };
}

export async function prepareGatewayPayment(input: {
  provider: PaymentProvider;
  amount: number;
  bookingCode: string;
  providerTxnRef: string;
  origin: string;
  returnUrl: string;
  ipAddr: string;
  requestedGatewayMode?: string | null;
}) {
  const gatewayMode = detectGatewayMode(input.requestedGatewayMode);
  const common = {
    amount: input.amount,
    bookingCode: input.bookingCode,
    providerTxnRef: input.providerTxnRef,
    origin: input.origin,
    returnUrl: input.returnUrl,
    gatewayMode,
  };

  if (input.provider === "VNPAY") {
    return buildVnpayPayment({ ...common, ipAddr: input.ipAddr });
  }
  if (input.provider === "MOMO") {
    return buildMomoPayment(common);
  }
  if (input.provider === "ZALOPAY") {
    return buildZalopayPayment(common);
  }
  return null;
}
