import { NextResponse } from "next/server";
import { findPaymentByTxnRef, updatePaymentStatus, verifyVnpayReturn } from "@/lib/payments";

function buildAppRedirect(returnUrl: string, params: Record<string, string>) {
  const url = new URL(returnUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const txnRef = params.get("vnp_TxnRef");

  if (!txnRef) {
    return NextResponse.json({ error: "Thieu vnp_TxnRef" }, { status: 400 });
  }

  const payment = await findPaymentByTxnRef(txnRef);
  if (!payment) {
    return NextResponse.json({ error: "Khong tim thay payment" }, { status: 404 });
  }

  const isValid = verifyVnpayReturn(params, payment.gateway_mode ?? "SANDBOX");
  const success =
    isValid &&
    params.get("vnp_ResponseCode") === "00" &&
    params.get("vnp_TransactionStatus") === "00";

  await updatePaymentStatus(txnRef, success ? "SUCCESS" : "FAILED", {
    source: "vnpay-return",
    code: params.get("vnp_ResponseCode"),
    isValid,
    query: Object.fromEntries(params.entries()),
  });

  const redirectUrl = buildAppRedirect(payment.return_url, {
    paymentId: String(payment.id),
    bookingId: String(payment.booking_id),
    provider: payment.provider,
    providerTxnRef: payment.provider_txn_ref,
    status: success ? "SUCCESS" : "FAILED",
  });

  return NextResponse.redirect(redirectUrl);
}
