import { ResultSetHeader, RowDataPacket } from "mysql2";
import { ensureRuntimeSchema, getPool } from "./db";

export type FeedbackPayload = {
  type: "SERVICE" | "CINEMA" | "TICKET" | "OTHER";
  cinemaId?: number | null;
  bookingId?: number | null;
  title: string;
  content: string;
  imageUrl?: string | null;
};

export type FeedbackFilters = {
  status?: string;
  type?: string;
  cinemaId?: number;
};

export async function createFeedback(userId: number, payload: FeedbackPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO feedbacks (user_id, type, cinema_id, booking_id, title, content, image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    [
      userId,
      payload.type,
      payload.cinemaId ?? null,
      payload.bookingId ?? null,
      payload.title,
      payload.content,
      payload.imageUrl ?? null,
    ]
  );
  
  return result.insertId;
}

export async function listFeedbacks(
  role: "USER" | "ADMIN" | "STAFF",
  userId: number,
  staffCinemaId: number | null,
  filters: FeedbackFilters = {}
) {
  await ensureRuntimeSchema();
  const pool = getPool();
  
  let query = `
    SELECT f.id, f.user_id, f.type, f.cinema_id, f.booking_id, f.title, f.content, f.image_url, f.status,
           f.response_content, f.responder_id, f.responded_at, f.created_at, f.updated_at,
           u.full_name AS customer_name, u.email AS customer_email,
           c.name AS cinema_name,
           b.booking_code
    FROM feedbacks f
    INNER JOIN users u ON u.id = f.user_id
    LEFT JOIN cinemas c ON c.id = f.cinema_id
    LEFT JOIN bookings b ON b.id = f.booking_id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  // Phân quyền truy cập
  if (role === "USER") {
    query += " AND f.user_id = ?";
    params.push(userId);
  } else if (role === "STAFF") {
    // STAFF chỉ được xem góp ý được gán cho rạp của mình
    if (!staffCinemaId) {
      // Nếu STAFF chưa được gán rạp thì trả về danh sách rỗng
      return [];
    }
    query += " AND f.cinema_id = ?";
    params.push(staffCinemaId);
  }
  
  // Áp dụng filters
  if (filters.status) {
    query += " AND f.status = ?";
    params.push(filters.status);
  }
  if (filters.type) {
    query += " AND f.type = ?";
    params.push(filters.type);
  }
  if (filters.cinemaId && (role === "ADMIN" || (role === "STAFF" && Number(filters.cinemaId) === staffCinemaId))) {
    query += " AND f.cinema_id = ?";
    params.push(filters.cinemaId);
  }
  
  query += " ORDER BY f.created_at DESC";
  
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    cinemaId: row.cinema_id,
    bookingId: row.booking_id,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url,
    status: row.status,
    responseContent: row.response_content,
    responderId: row.responder_id,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    cinemaName: row.cinema_name,
    bookingCode: row.booking_code,
  }));
}

export async function getFeedbackDetail(feedbackId: number) {
  await ensureRuntimeSchema();
  const pool = getPool();
  
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT f.id, f.user_id, f.type, f.cinema_id, f.booking_id, f.title, f.content, f.image_url, f.status,
            f.response_content, f.responder_id, f.responded_at, f.created_at, f.updated_at,
            u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
            c.name AS cinema_name,
            b.booking_code,
            res.full_name AS responder_name
     FROM feedbacks f
     INNER JOIN users u ON u.id = f.user_id
     LEFT JOIN cinemas c ON c.id = f.cinema_id
     LEFT JOIN bookings b ON b.id = f.booking_id
     LEFT JOIN users res ON res.id = f.responder_id
     WHERE f.id = ?
     LIMIT 1`,
    [feedbackId]
  );
  
  const row = rows[0];
  if (!row) return null;
  
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    cinemaId: row.cinema_id,
    bookingId: row.booking_id,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url,
    status: row.status,
    responseContent: row.response_content,
    responderId: row.responder_id,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    cinemaName: row.cinema_name,
    bookingCode: row.booking_code,
    responderName: row.responder_name,
  };
}

export async function respondFeedback(
  feedbackId: number,
  responderId: number,
  responseContent: string,
  status: "PROCESSING" | "RESOLVED" | "REJECTED"
) {
  await ensureRuntimeSchema();
  const pool = getPool();
  
  await pool.execute(
    `UPDATE feedbacks
     SET response_content = ?, responder_id = ?, responded_at = NOW(), status = ?
     WHERE id = ?`,
    [responseContent, responderId, status, feedbackId]
  );
}
