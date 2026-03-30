import { NextResponse } from "next/server";
import { requireAdmin, resolveSessionUser } from "@/lib/auth";
import { createVoucher, listAllVouchers, listAvailableVouchers } from "@/lib/vouchers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  if (mode === "admin") {
    await requireAdmin(request);
    return NextResponse.json({ vouchers: await listAllVouchers() });
  }
  const sessionUser = await resolveSessionUser(request);
  const userId = Number(sessionUser?.id ?? searchParams.get("userId") ?? 2);
  return NextResponse.json({ vouchers: await listAvailableVouchers(userId) });
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const id = await createVoucher(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tao voucher" },
      { status: 409 }
    );
  }
}
