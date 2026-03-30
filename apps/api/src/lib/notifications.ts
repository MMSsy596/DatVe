import { RowDataPacket } from "mysql2";
import { ensureRuntimeSchema, getPool } from "./db";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

async function sendExpoPushBatch(tokens: string[], payload: PushPayload) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(
      tokens.map((to) => ({
        to,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }))
    ),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push loi: ${response.status} ${text}`);
  }

  return response.json();
}

export async function registerPushToken(input: {
  userId: number;
  expoPushToken: string;
  deviceId?: string | null;
  platform?: string | null;
  appVersion?: string | null;
}) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute(
    `INSERT INTO user_push_tokens (user_id, expo_push_token, device_id, platform, app_version, last_seen_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       device_id = VALUES(device_id),
       platform = VALUES(platform),
       app_version = VALUES(app_version),
       last_seen_at = NOW()`,
    [
      input.userId,
      input.expoPushToken,
      input.deviceId ?? null,
      input.platform ?? "unknown",
      input.appVersion ?? null,
    ]
  );
}

export async function sendPushToUser(userId: number, payload: PushPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT expo_push_token
     FROM user_push_tokens
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId]
  );

  const tokens = rows
    .map((row) => String(row.expo_push_token))
    .filter((token) => token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));

  if (tokens.length === 0) {
    return { sent: 0, skipped: true };
  }

  await sendExpoPushBatch(tokens, payload);
  return { sent: tokens.length, skipped: false };
}

export async function dispatchDueReminders(limit = 25) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.booking_id, r.user_id, r.remind_at, b.booking_code,
            m.title AS movie_title, c.name AS cinema_name, s.start_time
     FROM booking_reminders r
     INNER JOIN bookings b ON b.id = r.booking_id
     INNER JOIN showtimes s ON s.id = b.showtime_id
     INNER JOIN movies m ON m.id = s.movie_id
     INNER JOIN cinemas c ON c.id = s.cinema_id
     WHERE r.status = 'SCHEDULED'
       AND r.remind_at <= NOW()
       AND b.status = 'PAID'
     ORDER BY r.remind_at ASC
     LIMIT ?`,
    [limit]
  );

  const dispatched: Array<{ id: number; userId: number; sent: number }> = [];
  for (const row of rows) {
    const result = await sendPushToUser(Number(row.user_id), {
      title: "Nhac lich suat chieu",
      body: `${row.movie_title} sap chieu tai ${row.cinema_name}.`,
      data: {
        bookingId: Number(row.booking_id),
        bookingCode: row.booking_code,
        startTime: row.start_time,
        type: "booking-reminder",
      },
    });

    await pool.execute(
      `UPDATE booking_reminders
       SET status = ?
       WHERE id = ?`,
      [result.sent > 0 ? "SENT" : "SCHEDULED", row.id]
    );

    dispatched.push({ id: Number(row.id), userId: Number(row.user_id), sent: result.sent });
  }

  return dispatched;
}

