import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "./db";

export async function listFavorites(userId: number) {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT m.id, m.slug, m.title, m.subtitle, m.genre, m.duration_minutes, m.rating, m.badge, m.highlight_color
     FROM favorites f
     INNER JOIN movies m ON m.id = f.movie_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function listWatchlist(userId: number) {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT m.id, m.slug, m.title, m.subtitle, m.genre, m.duration_minutes, m.rating, m.badge, m.highlight_color
     FROM watchlist w
     INNER JOIN movies m ON m.id = w.movie_id
     WHERE w.user_id = ?
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function addFavorite(userId: number, movieId: number) {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(
    `INSERT IGNORE INTO favorites (user_id, movie_id) VALUES (?, ?)`,
    [userId, movieId]
  );
}

export async function removeFavorite(userId: number, movieId: number) {
  const pool = getPool();
  await pool.execute(`DELETE FROM favorites WHERE user_id = ? AND movie_id = ?`, [userId, movieId]);
}

export async function addWatchlist(userId: number, movieId: number) {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(
    `INSERT IGNORE INTO watchlist (user_id, movie_id) VALUES (?, ?)`,
    [userId, movieId]
  );
}

export async function removeWatchlist(userId: number, movieId: number) {
  const pool = getPool();
  await pool.execute(`DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?`, [userId, movieId]);
}
