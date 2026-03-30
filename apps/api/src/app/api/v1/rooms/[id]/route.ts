import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteRoom, getRoomDetail, updateRoom } from "@/lib/crud";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const room = await getRoomDetail(Number(id));
  if (!room) {
    return NextResponse.json({ error: "Khong tim thay phong" }, { status: 404 });
  }
  return NextResponse.json(room);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await request.json();
    await updateRoom(Number(id), {
      cinemaId: Number(body.cinemaId),
      name: String(body.name ?? ""),
      formatLabel: body.formatLabel ?? "2D",
      seatLayout: body.seatLayout ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the cap nhat phong" },
      { status: 409 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    await deleteRoom(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the xoa phong" },
      { status: 409 }
    );
  }
}
