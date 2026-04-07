import { NextResponse } from "next/server";
import { findPaymentByTxnRef, updatePaymentStatus } from "@/lib/payments";

/** Append query params vào returnUrl an toàn - hỗ trợ cả deep link (datve://) */
function buildRedirectUrl(returnUrl: string, params: Record<string, string>): string | null {
  try {
    const url = new URL(returnUrl);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET(request: Request, context: { params: Promise<{ txnRef: string }> }) {
  const { txnRef } = await context.params;
  const { searchParams, origin } = new URL(request.url);
  const status = searchParams.get("status") === "SUCCESS" ? "SUCCESS" : "FAILED";
  const payment = await findPaymentByTxnRef(txnRef);

  if (!payment) {
    return NextResponse.json({ error: "Không tìm thấy giao dịch" }, { status: 404 });
  }

  await updatePaymentStatus(txnRef, status, {
    source: "mock",
    query: Object.fromEntries(searchParams.entries()),
  });

  const extraParams = {
    paymentId: String(payment.id),
    bookingId: String(payment.booking_id),
    provider: payment.provider,
    providerTxnRef: payment.provider_txn_ref,
    status,
  };

  // Thử redirect về returnUrl (deep link hoặc http)
  const redirectUrl = buildRedirectUrl(payment.return_url, extraParams);
  if (redirectUrl) {
    return NextResponse.redirect(redirectUrl);
  }

  // Fallback: deep link hoặc URL không hợp lệ → redirect về trang kết quả nội bộ
  const fallback = new URL(`${origin}/payment-result`);
  Object.entries(extraParams).forEach(([k, v]) => fallback.searchParams.set(k, v));
  return NextResponse.redirect(fallback.toString());
}
