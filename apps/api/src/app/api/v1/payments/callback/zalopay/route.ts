import { NextResponse } from "next/server";
import { findPaymentByProviderOrderId, findPaymentByTxnRef, updatePaymentStatus } from "@/lib/payments";

function appendResult(returnUrl: string, params: Record<string, string>) {
  const url = new URL(returnUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const data =
    typeof body.data === "string" ? (JSON.parse(body.data) as Record<string, unknown>) : body;
  const providerOrderId = String(data.app_trans_id ?? "");
  if (!providerOrderId) {
    return NextResponse.json({ return_code: -1, return_message: "Missing app_trans_id" }, { status: 400 });
  }

  const payment =
    (await findPaymentByTxnRef(String(data.providerTxnRef ?? ""))) ??
    (await findPaymentByProviderOrderId(providerOrderId));
  if (!payment) {
    return NextResponse.json({ return_code: -1, return_message: "Payment not found" }, { status: 404 });
  }

  await updatePaymentStatus(payment.provider_txn_ref, "SUCCESS", {
    source: "zalopay-callback",
    code: "1",
    body,
  });

  return NextResponse.json({ return_code: 1, return_message: "success" });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txnRef = String(searchParams.get("providerTxnRef") ?? "");
  if (!txnRef) {
    return NextResponse.json({ error: "Thieu providerTxnRef" }, { status: 400 });
  }
  const payment = await findPaymentByTxnRef(txnRef);
  if (!payment) {
    return NextResponse.json({ error: "Khong tim thay payment" }, { status: 404 });
  }
  const status = String(searchParams.get("status") ?? "SUCCESS") === "SUCCESS" ? "SUCCESS" : "FAILED";
  await updatePaymentStatus(payment.provider_txn_ref, status, {
    source: "zalopay-return",
    code: status === "SUCCESS" ? "1" : "-1",
    query: Object.fromEntries(searchParams.entries()),
  });
  return NextResponse.redirect(
    appendResult(payment.return_url, {
      paymentId: String(payment.id),
      bookingId: String(payment.booking_id),
      provider: payment.provider,
      providerTxnRef: payment.provider_txn_ref,
      status,
    })
  );
}
