import { NextResponse } from "next/server";
import { getShowtimeSeatMap } from "@/lib/seatmap";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const seatMap = await getShowtimeSeatMap(Number(id));

  if (!seatMap) {
    return NextResponse.json({ error: "Khong tim thay suat chieu" }, { status: 404 });
  }

  return NextResponse.json(seatMap);
}
