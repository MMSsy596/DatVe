import { RowDataPacket } from "mysql2";
import mysql, { Pool } from "mysql2/promise";

declare global {
  var __cineplusPool: Pool | undefined;
  var __cineplusSchemaReady: Promise<void> | undefined;
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL chưa được cấu hình");
  }

  if (!global.__cineplusPool) {
    global.__cineplusPool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return global.__cineplusPool;
}

async function hasTable(pool: Pool, tableName: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?
     LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
}

async function hasColumn(pool: Pool, tableName: string, columnName: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function hasIndex(pool: Pool, tableName: string, indexName: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND index_name = ?
     LIMIT 1`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

async function addIndexIfMissing(pool: Pool, tableName: string, indexName: string, statement: string) {
  if ((await hasTable(pool, tableName)) && !(await hasIndex(pool, tableName, indexName))) {
    await pool.execute(statement);
  }
}

export async function ensureRuntimeSchema() {
  if (!global.__cineplusSchemaReady) {
    global.__cineplusSchemaReady = (async () => {
      const pool = getPool();

      if (!(await hasColumn(pool, "users", "password_updated_at"))) {
        await pool.execute(
          "ALTER TABLE users ADD COLUMN password_updated_at DATETIME NULL AFTER avatar_url"
        );
      }

      if (!(await hasColumn(pool, "users", "google_sub"))) {
        await pool.execute(
          "ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL AFTER avatar_url"
        );
      }

      if (!(await hasColumn(pool, "banners", "image_url"))) {
        await pool.execute("ALTER TABLE banners ADD COLUMN image_url TEXT NULL AFTER accent_color");
      }

      if (!(await hasColumn(pool, "banners", "eyebrow"))) {
        await pool.execute(
          "ALTER TABLE banners ADD COLUMN eyebrow VARCHAR(120) NULL AFTER title"
        );
      }

      if (!(await hasColumn(pool, "movies", "poster_url"))) {
        await pool.execute("ALTER TABLE movies ADD COLUMN poster_url TEXT NULL AFTER badge");
      }

      if (!(await hasColumn(pool, "movies", "banner_url"))) {
        await pool.execute("ALTER TABLE movies ADD COLUMN banner_url TEXT NULL AFTER poster_url");
      }

      if (!(await hasColumn(pool, "movies", "trailer_url"))) {
        await pool.execute("ALTER TABLE movies ADD COLUMN trailer_url TEXT NULL AFTER banner_url");
      }

      if (!(await hasColumn(pool, "payments", "provider_order_id"))) {
        await pool.execute(
          "ALTER TABLE payments ADD COLUMN provider_order_id VARCHAR(120) NULL AFTER provider_txn_ref"
        );
      }

      if (!(await hasColumn(pool, "payments", "gateway_mode"))) {
        await pool.execute(
          "ALTER TABLE payments ADD COLUMN gateway_mode ENUM('SANDBOX','REAL') NOT NULL DEFAULT 'SANDBOX' AFTER mode"
        );
      }

      if (!(await hasColumn(pool, "payments", "provider_response_code"))) {
        await pool.execute(
          "ALTER TABLE payments ADD COLUMN provider_response_code VARCHAR(50) NULL AFTER response_payload"
        );
      }

      if (!(await hasTable(pool, "user_push_tokens"))) {
        await pool.execute(`
          CREATE TABLE user_push_tokens (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            expo_push_token VARCHAR(255) NOT NULL,
            device_id VARCHAR(120) NULL,
            platform ENUM('ios','android','web','unknown') NOT NULL DEFAULT 'unknown',
            app_version VARCHAR(40) NULL,
            last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_user_push_token (expo_push_token),
            KEY idx_user_push_tokens_user (user_id),
            CONSTRAINT fk_user_push_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
      }

      await addIndexIfMissing(
        pool,
        "bookings",
        "idx_bookings_showtime_status_expiry",
        "CREATE INDEX idx_bookings_showtime_status_expiry ON bookings (showtime_id, status, expires_at)"
      );
      await addIndexIfMissing(
        pool,
        "booking_seats",
        "idx_booking_seats_booking_code",
        "CREATE INDEX idx_booking_seats_booking_code ON booking_seats (booking_id, seat_code)"
      );
      await addIndexIfMissing(
        pool,
        "showtimes",
        "idx_showtimes_movie_start",
        "CREATE INDEX idx_showtimes_movie_start ON showtimes (movie_id, start_time)"
      );
      await addIndexIfMissing(
        pool,
        "showtimes",
        "idx_showtimes_room_start",
        "CREATE INDEX idx_showtimes_room_start ON showtimes (room_id, start_time)"
      );
      await addIndexIfMissing(
        pool,
        "payments",
        "idx_payments_provider_order_id",
        "CREATE INDEX idx_payments_provider_order_id ON payments (provider_order_id)"
      );
    })();
  }

  await global.__cineplusSchemaReady;
}
