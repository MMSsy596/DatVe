import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth";
import { finalizeBooking, listBookings } from "@/lib/booking";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionUser = await resolveSessionUser(request);
  const userId = sessionUser?.id ?? searchParams.get("userId");
  return NextResponse.json({
    bookings: await listBookings(userId ? Number(userId) : null),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionUser = await resolveSessionUser(request);
    const booking = await finalizeBooking({
      ...body,
      userId: sessionUser?.id ?? body.userId ?? null,
    });
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tao booking" },
      { status: 409 }
    );
  }
}
