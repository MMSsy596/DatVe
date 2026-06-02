import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth";
import { getBookingDetail, cancelHold } from "@/lib/booking";
import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2";

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

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const bookingId = Number(id);

    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      return NextResponse.json({ error: "ID đơn đặt vé không hợp lệ" }, { status: 400 });
    }

    const sessionUser = await resolveSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Cần đăng nhập để hủy giữ ghế" }, { status: 401 });
    }

    if (sessionUser.role === "USER") {
      const pool = getPool();
      const [[booking]] = await pool.query<RowDataPacket[]>(
        `SELECT user_id FROM bookings WHERE id = ? LIMIT 1`,
        [bookingId]
      );
      if (!booking) {
        return NextResponse.json({ error: "Không tìm thấy đơn đặt vé" }, { status: 404 });
      }
      if (booking.user_id !== null && Number(booking.user_id) !== sessionUser.id) {
        return NextResponse.json({ error: "Bạn không có quyền hủy đơn này" }, { status: 403 });
      }
    }

    const result = await cancelHold(bookingId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể hủy giữ ghế";
    const isValidationError = /chỉ có thể|không tìm|không hợp lệ/i.test(message);
    return NextResponse.json({ error: message }, { status: isValidationError ? 409 : 500 });
  }
}
