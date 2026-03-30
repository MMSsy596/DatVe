import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth";
import { getBookingDetail } from "@/lib/booking";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const booking = await getBookingDetail(Number(id));

  if (!booking) {
    return NextResponse.json({ error: "Khong tim thay booking" }, { status: 404 });
  }

  const sessionUser = await resolveSessionUser(request);
  if (sessionUser && sessionUser.role === "USER" && Number(booking.userId) !== sessionUser.id) {
    return NextResponse.json({ error: "Ban khong co quyen xem ve nay" }, { status: 403 });
  }

  return NextResponse.json(booking);
}
