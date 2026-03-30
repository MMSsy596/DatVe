import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteVoucher, updateVoucher } from "@/lib/vouchers";

export async function PUT(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    await requireAdmin(request);
    const { code } = await context.params;
    const body = await request.json();
    await updateVoucher(code, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the cap nhat voucher" },
      { status: 409 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    await requireAdmin(request);
    const { code } = await context.params;
    await deleteVoucher(code);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the xoa voucher" },
      { status: 409 }
    );
  }
}
