import { NextResponse } from "next/server";
import { extendHold } from "@/lib/booking";
import { resolveSessionUser } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const bookingId = Number(id);

    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      return NextResponse.json({ error: "ID đơn đặt vé không hợp lệ" }, { status: 400 });
    }

    // Kiểm tra quyền sở hữu: chỉ user sở hữu booking hoặc admin mới được gia hạn
    const sessionUser = await resolveSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Cần đăng nhập để gia hạn giữ ghế" }, { status: 401 });
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
      // booking có thể chưa gán user_id (giữ ghế anonymous), nhưng nếu có thì phải khớp
      if (booking.user_id !== null && Number(booking.user_id) !== sessionUser.id) {
        return NextResponse.json({ error: "Bạn không có quyền gia hạn đơn này" }, { status: 403 });
      }
    }

    const result = await extendHold(bookingId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gia hạn giữ ghế";
    const isValidationError = /tối đa|hết hạn|chỉ có thể|không tìm|không hợp lệ/i.test(message);
    return NextResponse.json({ error: message }, { status: isValidationError ? 409 : 500 });
  }
}
