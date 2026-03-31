import { RowDataPacket } from "mysql2";
import { ensureRuntimeSchema, getPool } from "./db";

export async function listPaymentReviews() {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.provider_txn_ref, p.provider, p.mode, p.amount, p.status, p.review_status, p.review_note, p.created_at,
            b.id AS booking_id, b.booking_code, b.customer_name, m.title AS movie_title, c.name AS cinema_name
     FROM payments p
     INNER JOIN bookings b ON b.id = p.booking_id
     INNER JOIN showtimes s ON s.id = b.showtime_id
     INNER JOIN movies m ON m.id = s.movie_id
     INNER JOIN cinemas c ON c.id = s.cinema_id
     ORDER BY p.created_at DESC`
  );
  return rows;
}

export async function reviewPayment(input: {
  providerTxnRef: string;
  reviewStatus: "APPROVED" | "REJECTED";
  reviewNote?: string | null;
  reviewerId: number;
}) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[payment]] = await connection.query<RowDataPacket[]>(
      `SELECT booking_id FROM payments WHERE provider_txn_ref = ? LIMIT 1`,
      [input.providerTxnRef]
    );
    if (!payment) {
      throw new Error("Không tìm thấy giao dịch.");
    }
    const paymentStatus = input.reviewStatus === "APPROVED" ? "SUCCESS" : "FAILED";
    const bookingStatus = input.reviewStatus === "APPROVED" ? "PAID" : "CANCELLED";
    await connection.execute(
      `UPDATE payments
       SET review_status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW(), status = ?, paid_at = CASE WHEN ? = 'SUCCESS' THEN NOW() ELSE paid_at END
       WHERE provider_txn_ref = ?`,
      [input.reviewStatus, input.reviewNote ?? null, input.reviewerId, paymentStatus, paymentStatus, input.providerTxnRef]
    );
    await connection.execute(`UPDATE bookings SET status = ? WHERE id = ?`, [bookingStatus, payment.booking_id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkInByQr(qrRaw: string, staffId: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const qr = qrRaw.trim();
  const [[booking]] = await pool.query<RowDataPacket[]>(
    `SELECT b.id, b.booking_code, b.status, b.check_in_status, b.checked_in_at,
            m.title AS movie_title, c.name AS cinema_name, s.start_time
     FROM bookings b
     INNER JOIN showtimes s ON s.id = b.showtime_id
     INNER JOIN movies m ON m.id = s.movie_id
     INNER JOIN cinemas c ON c.id = s.cinema_id
     WHERE b.qr_payload = ? OR b.booking_code = ? OR CONCAT('DATVE|', b.booking_code) = ?
     LIMIT 1`,
    [qr, qr, qr]
  );
  if (!booking) {
    throw new Error("Không tìm thấy vé cần check-in.");
  }
  if (booking.status !== "PAID") {
    throw new Error("Chỉ được check-in cho vé đã thanh toán.");
  }
  if (booking.check_in_status === "CHECKED_IN") {
    return {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      movieTitle: booking.movie_title,
      cinemaName: booking.cinema_name,
      startTime: booking.start_time,
      alreadyCheckedIn: true,
      checkedInAt: booking.checked_in_at,
      checkedInBy: staffId,
    };
  }
  await pool.execute(
    `UPDATE bookings
     SET check_in_status = 'CHECKED_IN', checked_in_at = NOW()
     WHERE id = ?`,
    [booking.id]
  );
  return {
    bookingId: booking.id,
    bookingCode: booking.booking_code,
    movieTitle: booking.movie_title,
    cinemaName: booking.cinema_name,
    startTime: booking.start_time,
    alreadyCheckedIn: false,
    checkedInAt: new Date().toISOString(),
    checkedInBy: staffId,
  };
}

export async function listReminders(userId?: number | null) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const clause = userId ? "WHERE r.user_id = ?" : "";
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.booking_id, r.user_id, r.remind_at, r.status,
            b.booking_code, m.title AS movie_title, c.name AS cinema_name, s.start_time
     FROM booking_reminders r
     INNER JOIN bookings b ON b.id = r.booking_id
     INNER JOIN showtimes s ON s.id = b.showtime_id
     INNER JOIN movies m ON m.id = s.movie_id
     INNER JOIN cinemas c ON c.id = s.cinema_id
     ${clause}
     ORDER BY r.remind_at ASC`,
    userId ? [userId] : []
  );
  return rows;
}

export async function upsertReminder(bookingId: number, userId: number, remindAt: string) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [[booking]] = await pool.query<RowDataPacket[]>(
    `SELECT b.id, b.status, s.start_time
     FROM bookings b
     INNER JOIN showtimes s ON s.id = b.showtime_id
     WHERE b.id = ? AND b.user_id = ?
     LIMIT 1`,
    [bookingId, userId]
  );
  if (!booking) {
    throw new Error("Không tìm thấy đơn hợp lệ để đặt nhắc lịch.");
  }
  if (booking.status !== "PAID") {
    throw new Error("Chỉ đặt nhắc lịch cho đơn đã thanh toán.");
  }
  const remindDate = new Date(remindAt.replace(" ", "T"));
  const showtimeDate = new Date(String(booking.start_time).replace(" ", "T"));
  if (Number.isNaN(remindDate.getTime())) {
    throw new Error("Thời gian nhắc lịch không hợp lệ.");
  }
  if (remindDate.getTime() >= showtimeDate.getTime()) {
    throw new Error("Nhắc lịch phải sớm hơn giờ chiếu.");
  }

  await pool.execute(
    `INSERT INTO booking_reminders (booking_id, user_id, remind_at, status)
     VALUES (?, ?, ?, 'SCHEDULED')
     ON DUPLICATE KEY UPDATE remind_at = VALUES(remind_at), status = 'SCHEDULED', user_id = VALUES(user_id)`,
    [bookingId, userId, remindAt]
  );
}

export async function cancelReminder(bookingId: number, userId: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute(
    `UPDATE booking_reminders
     SET status = 'CANCELLED'
     WHERE booking_id = ? AND user_id = ?`,
    [bookingId, userId]
  );
}
