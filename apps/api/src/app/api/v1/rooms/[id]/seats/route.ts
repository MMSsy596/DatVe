import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listRoomSeats, updateRoomSeats } from "@/lib/crud";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const room = await listRoomSeats(Number(id));

  if (!room) {
    return NextResponse.json({ error: "Khong tim thay phong" }, { status: 404 });
  }

  return NextResponse.json(room);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin(request);
  const { id } = await context.params;
  const body = await request.json();
  await updateRoomSeats(Number(id), body);
  return NextResponse.json({ ok: true });
}
