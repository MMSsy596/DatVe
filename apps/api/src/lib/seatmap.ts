import { RowDataPacket } from "mysql2";
import { getPool } from "./db";
import { cleanupExpiredHolds } from "./booking";

function seatPrice(basePrice: number, seatType: string) {
  if (seatType === "VIP") {
    return basePrice + 30000;
  }
  if (seatType === "COUPLE") {
    return basePrice + 90000;
  }
  return basePrice;
}

export async function getShowtimeSeatMap(showtimeId: number) {
  await cleanupExpiredHolds();
  const pool = getPool();
  const [[showtime]] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.base_price, s.room_id, s.start_time, s.format_label, s.language_label,
            m.title AS movie_title, c.name AS cinema_name, r.name AS room_name
     FROM showtimes s
     INNER JOIN movies m ON m.id = s.movie_id
     INNER JOIN cinemas c ON c.id = s.cinema_id
     INNER JOIN rooms r ON r.id = s.room_id
     WHERE s.id = ?
     LIMIT 1`,
    [showtimeId]
  );

  if (!showtime) {
    return null;
  }

  const [roomSeats] = await pool.query<RowDataPacket[]>(
    `SELECT seat_code, seat_type, row_label, column_index
     FROM room_seats
     WHERE room_id = ? AND is_active = TRUE
     ORDER BY row_label ASC, column_index ASC`,
    [showtime.room_id]
  );

  const [bookedSeats] = await pool.query<RowDataPacket[]>(
    `SELECT bs.seat_code, b.status
     FROM booking_seats bs
     INNER JOIN bookings b ON b.id = bs.booking_id
     WHERE b.showtime_id = ?
       AND (
         b.status = 'PAID' OR
         b.status = 'PENDING' OR
         (b.status = 'HELD' AND b.expires_at IS NOT NULL AND b.expires_at >= NOW())
       )`,
    [showtimeId]
  );

  const bookedMap = new Map<string, string>();
  for (const seat of bookedSeats) {
    bookedMap.set(seat.seat_code, seat.status === "HELD" ? "HELD" : "SOLD");
  }

  const rows = new Map<string, Array<Record<string, unknown>>>();

  for (const seat of roomSeats) {
    const key = seat.row_label;
    const items = rows.get(key) ?? [];
    items.push({
      seatCode: seat.seat_code,
      seatType: seat.seat_type,
      price: seatPrice(Number(showtime.base_price), seat.seat_type),
      status: bookedMap.get(seat.seat_code) ?? "AVAILABLE",
      rowLabel: seat.row_label,
      columnIndex: seat.column_index,
    });
    rows.set(key, items);
  }

  return {
    showtime: {
      id: showtime.id,
      basePrice: Number(showtime.base_price),
      startTime: showtime.start_time,
      formatLabel: showtime.format_label,
      languageLabel: showtime.language_label,
      movieTitle: showtime.movie_title,
      cinemaName: showtime.cinema_name,
      roomName: showtime.room_name,
    },
    rows: Array.from(rows.entries()).map(([rowLabel, seats]) => ({
      rowLabel,
      seats,
    })),
  };
}
