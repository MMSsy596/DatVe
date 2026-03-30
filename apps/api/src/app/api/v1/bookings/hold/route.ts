import { NextResponse } from "next/server";
import { holdSeats } from "@/lib/booking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const booking = await holdSeats(body);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the giu ghe" },
      { status: 409 }
    );
  }
}
