import { RowDataPacket } from "mysql2";
import { ensureRuntimeSchema, getPool } from "./db";

type BannerRow = RowDataPacket & {
  id: number;
  title: string;
  eyebrow: string | null;
  subtitle: string;
  accent_color: string | null;
  image_url: string | null;
};

type MovieRow = RowDataPacket & {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  genre: string;
  duration_minutes: number;
  rating: string | number;
  age_rating: "P" | "K" | "T13" | "T16" | "T18";
  badge: string | null;
  poster_url: string | null;
  banner_url: string | null;
  trailer_url: string | null;
  highlight_color: string | null;
  status: string;
  is_featured: number;
  box_office_rank: number | null;
};

type ShowtimeRow = RowDataPacket & {
  id: number;
  movie_id: number;
  cinema_id: number;
  room_id: number;
  start_time: Date;
  language_label: string;
  format_label: string;
  base_price: number;
  cinema_name: string;
  room_name: string;
  seat_layout_json: string;
  total_seats: number;
  occupied_seats: number;
};

type FoodRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
};

export async function getCatalogData() {
  await ensureRuntimeSchema();
  const pool = getPool();

  const [banners] = await pool.query<BannerRow[]>(
    `SELECT id, title, eyebrow, subtitle, accent_color, image_url
     FROM banners
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, id ASC`
  );

  const [movies] = await pool.query<MovieRow[]>(
    `SELECT id, slug, title, subtitle, genre, duration_minutes, rating, age_rating, badge, poster_url, banner_url, trailer_url, highlight_color, status, is_featured, box_office_rank
     FROM movies
     ORDER BY is_featured DESC, box_office_rank ASC, id ASC`
  );

  const [showtimes] = await pool.query<ShowtimeRow[]>(
    `SELECT s.id, s.movie_id, s.cinema_id, s.room_id, s.start_time, s.language_label, s.format_label, s.base_price,
            c.name AS cinema_name, r.name AS room_name, r.seat_layout_json,
            (
              SELECT COUNT(*)
              FROM room_seats rs
              WHERE rs.room_id = s.room_id AND rs.is_active = TRUE
            ) AS total_seats,
            (
              SELECT COUNT(*)
              FROM booking_seats bs
              INNER JOIN bookings b ON b.id = bs.booking_id
              WHERE b.showtime_id = s.id
                AND (
                  b.status = 'PAID' OR
                  b.status = 'PENDING' OR
                  (b.status = 'HELD' AND b.expires_at IS NOT NULL AND b.expires_at >= NOW())
                )
            ) AS occupied_seats
     FROM showtimes s
     INNER JOIN cinemas c ON c.id = s.cinema_id
     INNER JOIN rooms r ON r.id = s.room_id
     ORDER BY s.start_time ASC`
  );

  const [foods] = await pool.query<FoodRow[]>(
    `SELECT id, name, description, price, category
     FROM foods
     WHERE is_active = TRUE
     ORDER BY id ASC`
  );

  return {
    banners: banners.map((item) => ({
      id: item.id,
      eyebrow: item.eyebrow ?? "Khuyen mai DatVe",
      title: item.title,
      subtitle: item.subtitle,
      accentColor: item.accent_color,
      imageUrl: item.image_url,
    })),
    featuredMovies: movies.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      subtitle: item.subtitle,
      genre: item.genre,
      durationMinutes: item.duration_minutes,
      rating: Number(item.rating),
      ageRating: item.age_rating,
      badge: item.badge,
      posterUrl: item.poster_url,
      bannerUrl: item.banner_url,
      trailerUrl: item.trailer_url,
      highlightColor: item.highlight_color,
      status: item.status.toLowerCase(),
      isFeatured: Boolean(item.is_featured),
      boxOfficeRank: item.box_office_rank,
    })),
    showtimes: showtimes.map((item) => ({
      id: item.id,
      movieId: item.movie_id,
      cinemaId: item.cinema_id,
      roomId: item.room_id,
      startTime: item.start_time,
      languageLabel: item.language_label,
      formatLabel: item.format_label,
      basePrice: item.base_price,
      cinemaName: item.cinema_name,
      roomName: item.room_name,
      seatLayout: typeof item.seat_layout_json === "string" ? JSON.parse(item.seat_layout_json) : item.seat_layout_json,
      totalSeats: Number(item.total_seats ?? 0),
      availableSeats: Math.max(Number(item.total_seats ?? 0) - Number(item.occupied_seats ?? 0), 0),
    })),
    foods: foods.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
    })),
  };
}
