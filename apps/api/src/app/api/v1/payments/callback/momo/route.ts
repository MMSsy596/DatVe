import { NextResponse } from "next/server";
import { findPaymentByTxnRef, updatePaymentStatus, verifyMomoSignature } from "@/lib/payments";

function appendResult(returnUrl: string, params: Record<string, string>) {
  const url = new URL(returnUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryPayload = Object.fromEntries(searchParams.entries());
  const txnRef = searchParams.get("orderId");
  if (!txnRef) {
    return NextResponse.json({ error: "Thieu orderId" }, { status: 400 });
  }

  const payment = await findPaymentByTxnRef(txnRef);
  if (!payment) {
    return NextResponse.json({ error: "Khong tim thay payment" }, { status: 404 });
  }

  const resultCode = String(searchParams.get("resultCode") ?? "");
  const isValidSignature = verifyMomoSignature(queryPayload, payment.gateway_mode ?? "SANDBOX");
  const success = isValidSignature && resultCode === "0";
  await updatePaymentStatus(txnRef, success ? "SUCCESS" : "FAILED", {
    source: "momo-return",
    code: resultCode,
    isValidSignature,
    query: queryPayload,
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
  const payment = await findPaymentByTxnRef(txnRef);
  if (!payment) {
    return NextResponse.json({ resultCode: 1, message: "Payment not found" }, { status: 404 });
  }

  const resultCode = String(body.resultCode ?? "");
  const isValidSignature = verifyMomoSignature(body, payment.gateway_mode ?? "SANDBOX");
  if (!isValidSignature) {
    await updatePaymentStatus(txnRef, "FAILED", {
      source: "momo-ipn",
      code: "INVALID_SIGNATURE",
      body,
    });
    return NextResponse.json({ resultCode: 97, message: "Invalid signature" }, { status: 400 });
  }

  const success = resultCode === "0";
  await updatePaymentStatus(txnRef, success ? "SUCCESS" : "FAILED", {
    source: "momo-ipn",
    code: resultCode,
    isValidSignature,
    body,
  });
  return NextResponse.json({ resultCode: 0, message: "success" });
}
