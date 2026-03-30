import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listPaymentReviews } from "@/lib/operations";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ payments: await listPaymentReviews() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
