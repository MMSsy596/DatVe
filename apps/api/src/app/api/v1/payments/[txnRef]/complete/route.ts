import { NextResponse } from "next/server";
import { findPaymentByTxnRef, updatePaymentStatus } from "@/lib/payments";

function appendResult(returnUrl: string, params: Record<string, string>) {
  const url = new URL(returnUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

export async function GET(request: Request, context: { params: Promise<{ txnRef: string }> }) {
  const { txnRef } = await context.params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") === "SUCCESS" ? "SUCCESS" : "FAILED";
  const payment = await findPaymentByTxnRef(txnRef);

  if (!payment) {
    return NextResponse.json({ error: "Khong tim thay payment" }, { status: 404 });
  }

  await updatePaymentStatus(txnRef, status, {
    source: "mock",
    query: Object.fromEntries(searchParams.entries()),
  });

  const redirectUrl = appendResult(payment.return_url, {
    paymentId: String(payment.id),
    bookingId: String(payment.booking_id),
    provider: payment.provider,
    providerTxnRef: payment.provider_txn_ref,
    status,
  });

  return NextResponse.redirect(redirectUrl);
}
