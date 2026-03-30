import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteCinema, updateCinema } from "@/lib/crud";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin(request);
  const { id } = await context.params;
  const body = await request.json();
  await updateCinema(Number(id), body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin(request);
  const { id } = await context.params;
  await deleteCinema(Number(id));
  return NextResponse.json({ ok: true });
}
