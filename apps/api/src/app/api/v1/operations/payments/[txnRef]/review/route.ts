import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { reviewPayment } from "@/lib/operations";

export async function POST(request: Request, context: { params: Promise<{ txnRef: string }> }) {
  try {
    const reviewer = await requireAdmin(request);
    const { txnRef } = await context.params;
    const body = await request.json();
    await reviewPayment({
      providerTxnRef: txnRef,
      reviewStatus: body.reviewStatus,
      reviewNote: body.reviewNote ?? null,
      reviewerId: reviewer.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the review payment" },
      { status: 409 }
    );
  }
}
