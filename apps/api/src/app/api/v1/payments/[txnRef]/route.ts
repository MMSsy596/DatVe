import { NextResponse } from "next/server";
import { getPaymentDetail } from "@/lib/payments";

export async function GET(_request: Request, context: { params: Promise<{ txnRef: string }> }) {
  const { txnRef } = await context.params;
  const payment = await getPaymentDetail(txnRef);

  if (!payment) {
    return NextResponse.json({ error: "Khong tim thay payment" }, { status: 404 });
  }

  return NextResponse.json(payment);
}
