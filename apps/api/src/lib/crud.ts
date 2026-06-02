import { ResultSetHeader, RowDataPacket } from "mysql2";
import { ensureRuntimeSchema, getPool } from "./db";

export type MoviePayload = {
  slug: string;
  title: string;
  subtitle?: string | null;
  synopsis?: string | null;
  genre: string;
  durationMinutes: number;
  releaseDate?: string | null;
  status: "COMING_SOON" | "NOW_SHOWING" | "TRENDING";
  rating: number;
  ageRating?: "P" | "K" | "T13" | "T16" | "T18";
  badge?: string | null;
  posterUrl?: string | null;
  bannerUrl?: string | null;
  trailerUrl?: string | null;
  highlightColor?: string | null;
  isFeatured?: boolean;
  boxOfficeRank?: number | null;
};

export type BannerPayload = {
  title: string;
  eyebrow?: string | null;
  subtitle: string;
  accentColor?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type CinemaPayload = {
  name: string;
  city: string;
  address: string;
  description?: string | null;
};

export type ShowtimePayload = {
  movieId: number;
  cinemaId: number;
  roomId: number;
  startTime: string;
  languageLabel?: string;
  formatLabel?: string;
  basePrice: number;
  status?: "SCHEDULED" | "SELLING" | "SOLD_OUT";
};

export type RoomPayload = {
  cinemaId: number;
  name: string;
  formatLabel?: string | null;
  seatLayout?: string[][];
};

export type FoodPayload = {
  name: string;
  description?: string | null;
  price: number;
  category: "FOOD" | "DRINK" | "COMBO";
  isActive?: boolean;
};

export type RoomSeatPayload = {
  name?: string;
  formatLabel?: string;
  seats: Array<{
    seatCode: string;
    rowLabel: string;
    columnIndex: number;
    seatType: "STANDARD" | "VIP" | "COUPLE";
    isActive?: boolean;
  }>;
};

type IdRow = RowDataPacket & { id: number };

export async function getDashboardStats() {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [[movies]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM movies");
  const [[cinemas]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM cinemas");
  const [[showtimes]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM showtimes");
  const [[foods]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM foods WHERE is_active = TRUE");
  const [[vouchers]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM vouchers");
  const [[pendingReviews]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM payments WHERE review_status = 'PENDING'"
  );
  const [[bookings]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total, COALESCE(SUM(total_amount), 0) AS revenue FROM bookings WHERE status IN ('PENDING','PAID')"
  );
  const [dailyRevenue] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(created_at) AS revenue_date,
            COUNT(*) AS bookings,
            COALESCE(SUM(total_amount), 0) AS revenue
     FROM bookings
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       AND status IN ('PENDING','PAID')
     GROUP BY DATE(created_at)
     ORDER BY revenue_date ASC`
  );
  const [topMovies] = await pool.query<RowDataPacket[]>(
    `SELECT m.title,
            COUNT(b.id) AS bookings,
            COALESCE(SUM(b.total_amount), 0) AS revenue
     FROM bookings b
     INNER JOIN showtimes s ON s.id = b.showtime_id
     INNER JOIN movies m ON m.id = s.movie_id
     WHERE b.status IN ('PENDING','PAID')
     GROUP BY m.id, m.title
     ORDER BY revenue DESC, bookings DESC
     LIMIT 5`
  );
  const [recentActivity] = await pool.query<RowDataPacket[]>(
    `SELECT b.booking_code,
            b.status,
            b.total_amount,
            b.created_at,
            u.full_name AS customer_name,
            m.title AS movie_title,
            c.name AS cinema_name
     FROM bookings b
     LEFT JOIN users u ON u.id = b.user_id
     INNER JOIN showtimes s ON s.id = b.showtime_id
     INNER JOIN movies m ON m.id = s.movie_id
     INNER JOIN cinemas c ON c.id = s.cinema_id
     ORDER BY b.created_at DESC
     LIMIT 8`
  );
  const [[todayRevenue]] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(total_amount), 0) AS total
     FROM bookings
     WHERE DATE(created_at) = CURDATE()
       AND status IN ('PENDING','PAID')`
  );
  const [[weekRevenue]] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(total_amount), 0) AS total
     FROM bookings
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       AND status IN ('PENDING','PAID')`
  );

  return {
    movies: Number(movies.total),
    cinemas: Number(cinemas.total),
    showtimes: Number(showtimes.total),
    foods: Number(foods.total),
    vouchers: Number(vouchers.total),
    pendingReviews: Number(pendingReviews.total),
    bookings: Number(bookings.total),
    revenue: Number(bookings.revenue),
    todayRevenue: Number(todayRevenue.total),
    weekRevenue: Number(weekRevenue.total),
    dailyRevenue: dailyRevenue.map((item) => ({
      date: item.revenue_date,
      bookings: Number(item.bookings),
      revenue: Number(item.revenue),
    })),
    topMovies: topMovies.map((item) => ({
      title: item.title,
      bookings: Number(item.bookings),
      revenue: Number(item.revenue),
    })),
    recentActivity: recentActivity.map((item) => ({
      bookingCode: item.booking_code,
      status: item.status,
      totalAmount: Number(item.total_amount),
      createdAt: item.created_at,
      customerName: item.customer_name ?? "Khách lẻ",
      movieTitle: item.movie_title,
      cinemaName: item.cinema_name,
    })),
  };
}

export async function getUserProfile(userId: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [[user]] = await pool.query<RowDataPacket[]>(
    `SELECT id, full_name, email, phone, role, avatar_url, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  if (!user) {
    return null;
  }

  const [[stats]] = await pool.query<RowDataPacket[]>(
    `SELECT
        (SELECT COUNT(*) FROM favorites WHERE user_id = ?) AS favorite_total,
        (SELECT COUNT(*) FROM watchlist WHERE user_id = ?) AS watchlist_total,
        (SELECT COUNT(*) FROM bookings WHERE user_id = ?) AS booking_total,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE user_id = ? AND status IN ('PENDING','PAID')) AS spending_total`,
    [userId, userId, userId, userId]
  );

  const [activity] = await pool.query<RowDataPacket[]>(
    `SELECT activity_type, activity_title, activity_meta, activity_time
     FROM (
       SELECT 'BOOKING' AS activity_type,
              CONCAT('Đặt vé ', m.title) AS activity_title,
              CONCAT(c.name, ' | ', b.status, ' | ', b.total_amount) AS activity_meta,
              b.created_at AS activity_time
       FROM bookings b
       INNER JOIN showtimes s ON s.id = b.showtime_id
       INNER JOIN movies m ON m.id = s.movie_id
       INNER JOIN cinemas c ON c.id = s.cinema_id
       WHERE b.user_id = ?
       UNION ALL
       SELECT 'FAVORITE' AS activity_type,
              CONCAT('Thêm yêu thích: ', m.title) AS activity_title,
              m.genre AS activity_meta,
              f.created_at AS activity_time
       FROM favorites f
       INNER JOIN movies m ON m.id = f.movie_id
       WHERE f.user_id = ?
       UNION ALL
       SELECT 'WATCHLIST' AS activity_type,
              CONCAT('Thêm xem sau: ', m.title) AS activity_title,
              m.genre AS activity_meta,
              w.created_at AS activity_time
       FROM watchlist w
       INNER JOIN movies m ON m.id = w.movie_id
       WHERE w.user_id = ?
     ) activity_feed
     ORDER BY activity_time DESC
     LIMIT 8`,
    [userId, userId, userId]
  );

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    stats: {
      favorites: Number(stats.favorite_total),
      watchlist: Number(stats.watchlist_total),
      bookings: Number(stats.booking_total),
      spending: Number(stats.spending_total),
    },
    activity: activity.map((item) => ({
      type: item.activity_type,
      title: item.activity_title,
      meta: item.activity_meta,
      time: item.activity_time,
    })),
  };
}

export async function listMovies() {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, slug, title, subtitle, synopsis, genre, duration_minutes, release_date, status, rating, age_rating, badge, poster_url, banner_url, trailer_url, highlight_color, is_featured, box_office_rank
     FROM movies
     ORDER BY is_featured DESC, box_office_rank ASC, id DESC`
  );
  return rows;
}

export async function createMovie(payload: MoviePayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO movies
      (slug, title, subtitle, synopsis, genre, duration_minutes, release_date, status, rating, age_rating, badge, poster_url, banner_url, trailer_url, highlight_color, is_featured, box_office_rank)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.slug,
      payload.title,
      payload.subtitle ?? null,
      payload.synopsis ?? null,
      payload.genre,
      payload.durationMinutes,
      payload.releaseDate ?? null,
      payload.status,
      payload.rating,
      payload.ageRating ?? "T16",
      payload.badge ?? null,
      payload.posterUrl ?? null,
      payload.bannerUrl ?? null,
      payload.trailerUrl ?? null,
      payload.highlightColor ?? null,
      payload.isFeatured ? 1 : 0,
      payload.boxOfficeRank ?? null,
    ]
  );
  return result.insertId;
}

export async function updateMovie(id: number, payload: MoviePayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute(
    `UPDATE movies
     SET slug = ?, title = ?, subtitle = ?, synopsis = ?, genre = ?, duration_minutes = ?, release_date = ?, status = ?, rating = ?, age_rating = ?, badge = ?, poster_url = ?, banner_url = ?, trailer_url = ?, highlight_color = ?, is_featured = ?, box_office_rank = ?
     WHERE id = ?`,
    [
      payload.slug,
      payload.title,
      payload.subtitle ?? null,
      payload.synopsis ?? null,
      payload.genre,
      payload.durationMinutes,
      payload.releaseDate ?? null,
      payload.status,
      payload.rating,
      payload.ageRating ?? "T16",
      payload.badge ?? null,
      payload.posterUrl ?? null,
      payload.bannerUrl ?? null,
      payload.trailerUrl ?? null,
      payload.highlightColor ?? null,
      payload.isFeatured ? 1 : 0,
      payload.boxOfficeRank ?? null,
      id,
    ]
  );
}

export async function deleteMovie(id: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute("DELETE FROM movies WHERE id = ?", [id]);
}

export async function listBanners() {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, title, eyebrow, subtitle, accent_color, image_url, sort_order, is_active
     FROM banners
     ORDER BY sort_order ASC, id DESC`
  );
  return rows;
}

export async function createBanner(payload: BannerPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO banners (title, eyebrow, subtitle, accent_color, image_url, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.title,
      payload.eyebrow ?? null,
      payload.subtitle,
      payload.accentColor ?? null,
      payload.imageUrl ?? null,
      payload.sortOrder ?? 0,
      payload.isActive === false ? 0 : 1,
    ]
  );
  return result.insertId;
}

export async function updateBanner(id: number, payload: BannerPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute(
    `UPDATE banners
     SET title = ?, eyebrow = ?, subtitle = ?, accent_color = ?, image_url = ?, sort_order = ?, is_active = ?
     WHERE id = ?`,
    [
      payload.title,
      payload.eyebrow ?? null,
      payload.subtitle,
      payload.accentColor ?? null,
      payload.imageUrl ?? null,
      payload.sortOrder ?? 0,
      payload.isActive === false ? 0 : 1,
      id,
    ]
  );
}

export async function deleteBanner(id: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute("DELETE FROM banners WHERE id = ?", [id]);
}

export async function listCinemas() {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.id, c.name, c.city, c.address, c.description, COUNT(r.id) AS rooms
     FROM cinemas c
     LEFT JOIN rooms r ON r.cinema_id = c.id
     GROUP BY c.id
     ORDER BY c.id DESC`
  );
  return rows;
}

export async function createCinema(payload: CinemaPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO cinemas (name, city, address, description) VALUES (?, ?, ?, ?)`,
    [payload.name, payload.city, payload.address, payload.description ?? null]
  );

  // Tạo 1 phòng mặc định để admin có thể tạo suất chiếu ngay
  await pool.execute(
    `INSERT INTO rooms (cinema_id, name, format_label, seat_layout_json)
     VALUES (?, 'Phòng Mặc Định', '2D', JSON_ARRAY(JSON_ARRAY('A1','A2','A3','A4'), JSON_ARRAY('B1','B2','B3','B4')))`,
    [result.insertId]
  );

  return result.insertId;
}

export async function updateCinema(id: number, payload: CinemaPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute(
    `UPDATE cinemas SET name = ?, city = ?, address = ?, description = ? WHERE id = ?`,
    [payload.name, payload.city, payload.address, payload.description ?? null, id]
  );
}

export async function deleteCinema(id: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute("DELETE FROM cinemas WHERE id = ?", [id]);
}

export async function listRooms() {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.cinema_id, r.name, r.format_label, r.seat_layout_json, c.name AS cinema_name
     FROM rooms r
     INNER JOIN cinemas c ON c.id = r.cinema_id
     ORDER BY c.id ASC, r.id ASC`
  );
  return rows;
}

export async function createRoom(payload: RoomPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const seatLayout =
    payload.seatLayout && payload.seatLayout.length > 0
      ? payload.seatLayout
      : [
          ["A1", "A2", "A3", "A4", "A5", "A6"],
          ["B1", "B2", "B3", "B4", "B5", "B6"],
          ["C1", "C2", "C3", "C4", "C5", "C6"],
        ];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO rooms (cinema_id, name, format_label, seat_layout_json)
       VALUES (?, ?, ?, ?)`,
      [payload.cinemaId, payload.name, payload.formatLabel ?? "2D", JSON.stringify(seatLayout)]
    );
    for (const [rowIndex, row] of seatLayout.entries()) {
      const rowLabel = String.fromCharCode(65 + rowIndex);
      for (const [columnIndex, seatCode] of row.entries()) {
        const seatType =
          rowLabel >= "E" && columnIndex >= 4 ? "COUPLE" : columnIndex >= row.length - 2 ? "VIP" : "STANDARD";
        await connection.execute(
          `INSERT INTO room_seats (room_id, seat_code, seat_type, row_label, column_index, is_active)
           VALUES (?, ?, ?, ?, ?, TRUE)`,
          [result.insertId, seatCode, seatType, rowLabel, columnIndex + 1]
        );
      }
    }
    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateRoom(id: number, payload: RoomPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute(
    `UPDATE rooms
     SET cinema_id = ?, name = ?, format_label = COALESCE(?, format_label), seat_layout_json = COALESCE(?, seat_layout_json)
     WHERE id = ?`,
    [
      payload.cinemaId,
      payload.name,
      payload.formatLabel ?? null,
      payload.seatLayout ? JSON.stringify(payload.seatLayout) : null,
      id,
    ]
  );
}

export async function deleteRoom(id: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute("DELETE FROM rooms WHERE id = ?", [id]);
}

export async function listShowtimes() {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.movie_id, s.cinema_id, s.room_id, s.start_time, s.language_label, s.format_label, s.base_price, s.status,
            m.title AS movie_title, c.name AS cinema_name, r.name AS room_name
     FROM showtimes s
     INNER JOIN movies m ON m.id = s.movie_id
     INNER JOIN cinemas c ON c.id = s.cinema_id
     INNER JOIN rooms r ON r.id = s.room_id
     ORDER BY s.start_time DESC`
  );
  return rows;
}

export async function createShowtime(payload: ShowtimePayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO showtimes
      (movie_id, cinema_id, room_id, start_time, language_label, format_label, base_price, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.movieId,
      payload.cinemaId,
      payload.roomId,
      payload.startTime,
      payload.languageLabel ?? "Phụ đề",
      payload.formatLabel ?? "2D",
      payload.basePrice,
      payload.status ?? "SELLING",
    ]
  );
  return result.insertId;
}

export async function updateShowtime(id: number, payload: ShowtimePayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute(
    `UPDATE showtimes
     SET movie_id = ?, cinema_id = ?, room_id = ?, start_time = ?, language_label = ?, format_label = ?, base_price = ?, status = ?
     WHERE id = ?`,
    [
      payload.movieId,
      payload.cinemaId,
      payload.roomId,
      payload.startTime,
      payload.languageLabel ?? "Phụ đề",
      payload.formatLabel ?? "2D",
      payload.basePrice,
      payload.status ?? "SELLING",
      id,
    ]
  );
}

export async function deleteShowtime(id: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute("DELETE FROM showtimes WHERE id = ?", [id]);
}

export async function listFoods() {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, description, price, category, is_active
     FROM foods
     ORDER BY id DESC`
  );
  return rows;
}

export async function createFood(payload: FoodPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO foods (name, description, price, category, is_active) VALUES (?, ?, ?, ?, ?)`,
    [payload.name, payload.description ?? null, payload.price, payload.category, payload.isActive === false ? 0 : 1]
  );
  return result.insertId;
}

export async function updateFood(id: number, payload: FoodPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute(
    `UPDATE foods SET name = ?, description = ?, price = ?, category = ?, is_active = ? WHERE id = ?`,
    [payload.name, payload.description ?? null, payload.price, payload.category, payload.isActive === false ? 0 : 1, id]
  );
}

export async function deleteFood(id: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute("DELETE FROM foods WHERE id = ?", [id]);
}

export async function findRoomById(id: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [rows] = await pool.query<IdRow[]>("SELECT id FROM rooms WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function getRoomDetail(id: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [[room]] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.cinema_id, r.name, r.format_label, r.seat_layout_json, c.name AS cinema_name
     FROM rooms r
     INNER JOIN cinemas c ON c.id = r.cinema_id
     WHERE r.id = ?
     LIMIT 1`,
    [id]
  );
  return room ?? null;
}

export async function listRoomSeats(roomId: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [[room]] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.cinema_id, r.name, r.format_label, r.seat_layout_json, c.name AS cinema_name
     FROM rooms r
     INNER JOIN cinemas c ON c.id = r.cinema_id
     WHERE r.id = ?
     LIMIT 1`,
    [roomId]
  );

  if (!room) {
    return null;
  }

  const [seats] = await pool.query<RowDataPacket[]>(
    `SELECT seat_code, seat_type, row_label, column_index, is_active
     FROM room_seats
     WHERE room_id = ?
     ORDER BY row_label ASC, column_index ASC`,
    [roomId]
  );

  return {
    id: room.id,
    cinemaId: room.cinema_id,
    cinemaName: room.cinema_name,
    name: room.name,
    formatLabel: room.format_label,
    seatLayout:
      typeof room.seat_layout_json === "string"
        ? JSON.parse(room.seat_layout_json)
        : room.seat_layout_json,
    seats: seats.map((seat) => ({
      seatCode: seat.seat_code,
      seatType: seat.seat_type,
      rowLabel: seat.row_label,
      columnIndex: Number(seat.column_index),
      isActive: Boolean(seat.is_active),
    })),
  };
}

export async function updateRoomSeats(roomId: number, payload: RoomSeatPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (payload.name || payload.formatLabel) {
      await connection.execute(
        `UPDATE rooms
         SET name = COALESCE(?, name),
             format_label = COALESCE(?, format_label)
         WHERE id = ?`,
        [payload.name ?? null, payload.formatLabel ?? null, roomId]
      );
    }

    const activeSeats = payload.seats
      .filter((seat) => seat.isActive !== false)
      .sort((a, b) => a.rowLabel.localeCompare(b.rowLabel) || a.columnIndex - b.columnIndex);

    const layoutMap = new Map<string, string[]>();
    for (const seat of activeSeats) {
      const row = layoutMap.get(seat.rowLabel) ?? [];
      row.push(seat.seatCode);
      layoutMap.set(seat.rowLabel, row);
    }
    const seatLayout = Array.from(layoutMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, seats]) => seats);

    await connection.execute(`UPDATE rooms SET seat_layout_json = ? WHERE id = ?`, [
      JSON.stringify(seatLayout),
      roomId,
    ]);

    await connection.execute(`DELETE FROM room_seats WHERE room_id = ?`, [roomId]);

    if (payload.seats.length > 0) {
      for (const seat of payload.seats) {
        await connection.execute(
          `INSERT INTO room_seats
            (room_id, seat_code, seat_type, row_label, column_index, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            roomId,
            seat.seatCode,
            seat.seatType,
            seat.rowLabel,
            seat.columnIndex,
            seat.isActive === false ? 0 : 1,
          ]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
