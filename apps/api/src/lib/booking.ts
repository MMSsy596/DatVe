import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "./db";
import { calculateVoucherDiscount, findVoucherForCheckout } from "./vouchers";

type HoldPayload = {
  showtimeId: number;
  seats: Array<{ seatCode: string; seatType: "STANDARD" | "VIP" | "COUPLE"; price: number }>;
};

type FinalizePayload = {
  bookingId: number;
  userId?: number | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: string;
  voucherCode?: string | null;
  items: Array<{ foodId: number; quantity: number; price: number }>;
};

function makeBookingCode() {
  return `DV${Date.now().toString().slice(-8)}`;
}

function makeQrPayload(input: { bookingCode: string; bookingId: number; showtimeId: number; userId?: number | null }) {
  return `DATVE|${input.bookingCode}|${input.bookingId}|${input.showtimeId}|${input.userId ?? "guest"}`;
}

function canonicalSeatPrice(basePrice: number, seatType: string) {
  if (seatType === "VIP") {
    return basePrice + 30000;
  }
  if (seatType === "COUPLE") {
    return basePrice + 90000;
  }
  return basePrice;
}

export async function cleanupExpiredHolds() {
  const pool = getPool();
  await pool.execute(
    `UPDATE bookings
     SET status = 'EXPIRED'
     WHERE status = 'HELD' AND expires_at IS NOT NULL AND expires_at < NOW()`
  );
}

export async function holdSeats(payload: HoldPayload) {
  await cleanupExpiredHolds();
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[showtime]] = await connection.query<RowDataPacket[]>(
      `SELECT room_id, base_price FROM showtimes WHERE id = ? LIMIT 1`,
      [payload.showtimeId]
    );

    if (!showtime) {
      throw new Error("Khong tim thay suat chieu.");
    }

    const normalizedSeats: Array<{ seatCode: string; seatType: "STANDARD" | "VIP" | "COUPLE"; price: number }> = [];

    for (const seat of payload.seats) {
      const [[roomSeat]] = await connection.query<RowDataPacket[]>(
        `SELECT seat_code, seat_type
         FROM room_seats
         WHERE room_id = ? AND seat_code = ? AND is_active = TRUE
         LIMIT 1`,
        [showtime.room_id, seat.seatCode]
      );

      if (!roomSeat) {
        throw new Error(`Ghe ${seat.seatCode} khong hop le.`);
      }

      const [conflicts] = await connection.query<RowDataPacket[]>(
        `SELECT bs.id
         FROM booking_seats bs
         INNER JOIN bookings b ON b.id = bs.booking_id
         WHERE b.showtime_id = ?
           AND bs.seat_code = ?
           AND (
             b.status = 'PAID' OR
             b.status = 'PENDING' OR
             (b.status = 'HELD' AND b.expires_at IS NOT NULL AND b.expires_at >= NOW())
           )
         LIMIT 1`,
        [payload.showtimeId, seat.seatCode]
      );

      if (conflicts.length > 0) {
        throw new Error(`Ghe ${seat.seatCode} da duoc giu hoac thanh toan.`);
      }

      normalizedSeats.push({
        seatCode: roomSeat.seat_code,
        seatType: roomSeat.seat_type,
        price: canonicalSeatPrice(Number(showtime.base_price), roomSeat.seat_type),
      });
    }

    const bookingCode = makeBookingCode();
    const totalAmount = normalizedSeats.reduce((sum, seat) => sum + seat.price, 0);

    const [bookingResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO bookings (showtime_id, booking_code, status, total_amount, expires_at)
       VALUES (?, ?, 'HELD', ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [payload.showtimeId, bookingCode, totalAmount]
    );

    for (const seat of normalizedSeats) {
      await connection.execute(
        `INSERT INTO booking_seats (booking_id, seat_code, seat_type, price) VALUES (?, ?, ?, ?)`,
        [bookingResult.insertId, seat.seatCode, seat.seatType, seat.price]
      );
    }

    await connection.commit();

    return {
      id: bookingResult.insertId,
      bookingCode,
      status: "HELD",
      totalAmount,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function finalizeBooking(payload: FinalizePayload) {
  await cleanupExpiredHolds();
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[booking]] = await connection.query<RowDataPacket[]>(
      `SELECT id, booking_code, showtime_id, status, expires_at,
              CASE
                WHEN expires_at IS NULL THEN 1
                WHEN expires_at >= NOW() THEN 1
                ELSE 0
              END AS is_not_expired
       FROM bookings
       WHERE id = ?
       LIMIT 1`,
      [payload.bookingId]
    );

    if (!booking) {
      throw new Error("Khong tim thay booking.");
    }

    if (booking.status === "EXPIRED") {
      throw new Error("Booking da het han giu ghe.");
    }

    if (booking.status === "HELD" && Number(booking.is_not_expired) !== 1) {
      throw new Error("Booking da het han giu ghe.");
    }

    await connection.execute("DELETE FROM booking_items WHERE booking_id = ?", [payload.bookingId]);

    let itemsTotal = 0;
    for (const item of payload.items) {
      itemsTotal += item.quantity * item.price;
      await connection.execute(
        `INSERT INTO booking_items (booking_id, food_id, quantity, price) VALUES (?, ?, ?, ?)`,
        [payload.bookingId, item.foodId, item.quantity, item.price]
      );
    }

    const [[seatTotalRow]] = await connection.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(price), 0) AS seat_total FROM booking_seats WHERE booking_id = ?`,
      [payload.bookingId]
    );

    const originalTotal = Number(seatTotalRow.seat_total) + itemsTotal;
    let discountAmount = 0;
    let voucherCode: string | null = null;
    if (payload.voucherCode?.trim()) {
      const voucher = (await findVoucherForCheckout(payload.voucherCode, payload.userId ?? null)) as {
        code: string;
        discount_type: "PERCENT" | "FIXED";
        discount_value: number;
        min_order_value: number;
        max_discount_value: number | null;
        is_active: number | boolean;
        expires_at: string | null;
      };
      discountAmount = calculateVoucherDiscount(voucher, originalTotal);
      if (discountAmount <= 0) {
        throw new Error("Don hang chua du dieu kien ap voucher.");
      }
      voucherCode = String(voucher.code).trim().toUpperCase();
    }
    const totalAmount = Math.max(originalTotal - discountAmount, 0);
    const qrPayload = makeQrPayload({
      bookingCode: String(booking.booking_code),
      bookingId: payload.bookingId,
      showtimeId: Number(booking.showtime_id),
      userId: payload.userId ?? null,
    });

    await connection.execute(
      `UPDATE bookings
       SET user_id = ?, customer_name = ?, customer_email = ?, customer_phone = ?, payment_method = ?, total_amount = ?, discount_amount = ?, voucher_code = ?, qr_payload = ?, status = 'PENDING'
       WHERE id = ?`,
      [
        payload.userId ?? null,
        payload.customerName,
        payload.customerEmail,
        payload.customerPhone,
        payload.paymentMethod,
        totalAmount,
        discountAmount,
        voucherCode,
        qrPayload,
        payload.bookingId,
      ]
    );

    await connection.commit();
    return getBookingDetail(payload.bookingId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getBookingDetail(id: number) {
  const pool = getPool();
  const [[booking]] = await pool.query<RowDataPacket[]>(
    `SELECT b.id, b.user_id, b.booking_code, b.status, b.total_amount, b.discount_amount, b.voucher_code, b.payment_method, b.customer_name, b.customer_email, b.customer_phone, b.expires_at,
            b.qr_payload, b.check_in_status, b.checked_in_at,
            s.start_time, s.format_label, s.language_label,
            m.title AS movie_title,
            c.name AS cinema_name,
            r.name AS room_name
     FROM bookings b
     INNER JOIN showtimes s ON s.id = b.showtime_id
     INNER JOIN movies m ON m.id = s.movie_id
     INNER JOIN cinemas c ON c.id = s.cinema_id
     INNER JOIN rooms r ON r.id = s.room_id
     WHERE b.id = ?
     LIMIT 1`,
    [id]
  );

  if (!booking) {
    return null;
  }

  const [seats] = await pool.query<RowDataPacket[]>(
    `SELECT seat_code, seat_type, price FROM booking_seats WHERE booking_id = ? ORDER BY seat_code ASC`,
    [id]
  );

  const [items] = await pool.query<RowDataPacket[]>(
    `SELECT bi.food_id, bi.quantity, bi.price, f.name
     FROM booking_items bi
     INNER JOIN foods f ON f.id = bi.food_id
     WHERE bi.booking_id = ?`,
    [id]
  );

  const [[reminder]] = await pool.query<RowDataPacket[]>(
    `SELECT remind_at, status
     FROM booking_reminders
     WHERE booking_id = ?
     LIMIT 1`,
    [id]
  );

  return {
    id: booking.id,
    userId: booking.user_id,
    bookingCode: booking.booking_code,
    status: booking.status,
    totalAmount: booking.total_amount,
    discountAmount: Number(booking.discount_amount ?? 0),
    voucherCode: booking.voucher_code,
    paymentMethod: booking.payment_method,
    customerName: booking.customer_name,
    customerEmail: booking.customer_email,
    customerPhone: booking.customer_phone,
    expiresAt: booking.expires_at,
    qrPayload: booking.qr_payload,
    checkInStatus: booking.check_in_status,
    checkedInAt: booking.checked_in_at,
    showtime: {
      startTime: booking.start_time,
      formatLabel: booking.format_label,
      languageLabel: booking.language_label,
      movieTitle: booking.movie_title,
      cinemaName: booking.cinema_name,
      roomName: booking.room_name,
    },
    seats: seats.map((seat) => ({
      seatCode: seat.seat_code,
      seatType: seat.seat_type,
      price: seat.price,
    })),
    items: items.map((item) => ({
      foodId: item.food_id,
      quantity: item.quantity,
      price: item.price,
      name: item.name,
    })),
    reminder: reminder
      ? {
          remindAt: reminder.remind_at,
          status: reminder.status,
        }
      : null,
  };
}

export async function listBookings(userId?: number | null) {
  await cleanupExpiredHolds();
  const pool = getPool();
  const whereClause =
    typeof userId === "number" && Number.isFinite(userId) ? "WHERE b.user_id = ?" : "";
  const values = whereClause ? [userId] : [];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT b.id, b.booking_code, b.status, b.total_amount, b.discount_amount, b.voucher_code, b.customer_name, b.customer_email, b.expires_at, b.check_in_status,
            m.title AS movie_title, c.name AS cinema_name, s.start_time,
            GROUP_CONCAT(bs.seat_code ORDER BY bs.seat_code ASC SEPARATOR ', ') AS seat_codes
     FROM bookings b
     INNER JOIN showtimes s ON s.id = b.showtime_id
     INNER JOIN movies m ON m.id = s.movie_id
     INNER JOIN cinemas c ON c.id = s.cinema_id
     LEFT JOIN booking_seats bs ON bs.booking_id = b.id
     ${whereClause}
     GROUP BY b.id, b.booking_code, b.status, b.total_amount, b.discount_amount, b.voucher_code, b.customer_name, b.customer_email, b.expires_at, b.check_in_status, m.title, c.name, s.start_time
     ORDER BY b.id DESC`,
    values
  );
  return rows;
}
