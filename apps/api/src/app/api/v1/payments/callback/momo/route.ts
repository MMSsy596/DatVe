import { NextResponse } from "next/server";
import { findPaymentByTxnRef, updatePaymentStatus } from "@/lib/payments";

function appendResult(returnUrl: string, params: Record<string, string>) {
  const url = new URL(returnUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txnRef = searchParams.get("orderId");
  if (!txnRef) {
    return NextResponse.json({ error: "Thieu orderId" }, { status: 400 });
  }

  const payment = await findPaymentByTxnRef(txnRef);
  if (!payment) {
    return NextResponse.json({ error: "Khong tim thay payment" }, { status: 404 });
  }

  const resultCode = String(searchParams.get("resultCode") ?? "");
  const success = resultCode === "0";
  await updatePaymentStatus(txnRef, success ? "SUCCESS" : "FAILED", {
    source: "momo-return",
    code: resultCode,
    query: Object.fromEntries(searchParams.entries()),
  });

  return NextResponse.redirect(
    appendResult(payment.return_url, {
      paymentId: String(payment.id),
      bookingId: String(payment.booking_id),
      provider: payment.provider,
      providerTxnRef: payment.provider_txn_ref,
      status: success ? "SUCCESS" : "FAILED",
    })
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const txnRef = String(body.orderId ?? "");
  if (!txnRef) {
    return NextResponse.json({ resultCode: 1, message: "Missing orderId" }, { status: 400 });
  }
  const resultCode = String(body.resultCode ?? "");
  const success = resultCode === "0";
  await updatePaymentStatus(txnRef, success ? "SUCCESS" : "FAILED", {
    source: "momo-ipn",
    code: resultCode,
    body,
  });
  return NextResponse.json({ resultCode: 0, message: "success" });
}
