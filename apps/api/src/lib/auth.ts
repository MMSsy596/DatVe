import crypto from "node:crypto";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { ensureRuntimeSchema, getPool } from "./db";

export type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: "USER" | "ADMIN" | "STAFF";
  avatarUrl: string | null;
};

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function encodePassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${hashPassword(password, salt)}`;
}

function verifyPassword(password: string, encoded: string | null) {
  if (!encoded) return false;
  const [salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  const actual = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
}) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const normalizedEmail = input.email.trim().toLowerCase();
  const [[existing]] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [normalizedEmail]
  );
  if (existing) {
    throw new Error("Email da ton tai.");
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (full_name, email, password_hash, phone, role, avatar_url)
     VALUES (?, ?, ?, ?, 'USER', ?)`,
    [
      input.fullName.trim(),
      normalizedEmail,
      encodePassword(input.password),
      input.phone?.trim() || null,
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(input.fullName.trim())}`,
    ]
  );

  return createSession(result.insertId, "React Native");
}

export async function loginUser(input: { email: string; password: string; deviceName?: string | null }) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const normalizedEmail = input.email.trim().toLowerCase();
  const [[user]] = await pool.query<RowDataPacket[]>(
    `SELECT id, password_hash
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [normalizedEmail]
  );

  if (!user || !verifyPassword(input.password, user.password_hash)) {
    throw new Error("Email hoac mat khau khong dung.");
  }

  return createSession(Number(user.id), input.deviceName ?? "React Native");
}

export async function createSession(userId: number, deviceName?: string | null) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  await pool.execute(
    `INSERT INTO user_sessions (user_id, token_hash, device_name, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 14 DAY))`,
    [userId, tokenHash, deviceName ?? null]
  );
  const user = await getSessionUser(rawToken);
  if (!user) {
    throw new Error("Khong the tao session.");
  }
  return { token: rawToken, user };
}

export async function getSessionUser(token: string) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [[user]] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.avatar_url
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND s.expires_at >= NOW()
     LIMIT 1`,
    [hashToken(token)]
  );

  if (!user) return null;

  await pool.execute(
    `UPDATE user_sessions SET last_seen_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL 14 DAY)
     WHERE token_hash = ?`,
    [hashToken(token)]
  );

  return {
    id: Number(user.id),
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatar_url,
  } as SessionUser;
}

export async function resolveSessionUser(request: Request) {
  const token = readBearerToken(request);
  if (!token) return null;
  return getSessionUser(token);
}

export async function requireSession(request: Request) {
  const user = await resolveSessionUser(request);
  if (!user) {
    throw new Error("Can dang nhap de tiep tuc.");
  }
  return user;
}

export async function requireAdmin(request: Request) {
  const user = await requireSession(request);
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    throw new Error("Ban khong co quyen thuc hien thao tac nay.");
  }
  return user;
}

export async function logoutToken(token: string) {
  await ensureRuntimeSchema();
  const pool = getPool();
  await pool.execute("DELETE FROM user_sessions WHERE token_hash = ?", [hashToken(token)]);
}
