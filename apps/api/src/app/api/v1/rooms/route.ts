import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createRoom, listRooms } from "@/lib/crud";

export async function GET() {
  return NextResponse.json({ rooms: await listRooms() });
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const id = await createRoom({
      cinemaId: Number(body.cinemaId),
      name: String(body.name ?? ""),
      formatLabel: body.formatLabel ?? "2D",
      seatLayout: body.seatLayout ?? undefined,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tao phong" },
      { status: 409 }
    );
  }
}
