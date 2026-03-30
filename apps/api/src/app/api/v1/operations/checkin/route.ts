import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkInByQr } from "@/lib/operations";

export async function POST(request: Request) {
  try {
    const staff = await requireAdmin(request);
    const body = await request.json();
    const result = await checkInByQr(String(body.qrRaw ?? ""), staff.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the check-in" },
      { status: 409 }
    );
  }
}
