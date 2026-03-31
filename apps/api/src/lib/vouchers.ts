import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "./db";

export type VoucherPayload = {
  code: string;
  title: string;
  description?: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minOrderValue: number;
  maxDiscountValue?: number | null;
  assignedUserId?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
};

export function calculateVoucherDiscount(
  voucher: {
    discount_type: "PERCENT" | "FIXED";
    discount_value: number;
    min_order_value: number;
    max_discount_value: number | null;
    is_active: number | boolean;
    expires_at: string | null;
  },
  originalPrice: number
) {
  if (!voucher || !voucher.is_active) return 0;
  if (originalPrice <= 0 || originalPrice < Number(voucher.min_order_value)) return 0;
  if (voucher.expires_at && new Date(voucher.expires_at).getTime() < Date.now()) return 0;
  const raw =
    voucher.discount_type === "PERCENT"
      ? Math.floor((originalPrice * Number(voucher.discount_value)) / 100)
      : Number(voucher.discount_value);
  if (voucher.max_discount_value != null) {
    return Math.max(0, Math.min(raw, Number(voucher.max_discount_value)));
  }
  return Math.max(0, raw);
}

export async function listAvailableVouchers(userId: number) {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT v.id, v.code, v.title, v.description, v.discount_type, v.discount_value, v.min_order_value, v.max_discount_value,
            v.assigned_user_id, v.expires_at, v.is_active
     FROM vouchers v
     WHERE v.is_active = TRUE
       AND (v.assigned_user_id IS NULL OR v.assigned_user_id = ?)
       AND (v.expires_at IS NULL OR v.expires_at >= NOW())
       AND NOT EXISTS (
         SELECT 1
         FROM voucher_usages vu
         WHERE vu.voucher_id = v.id AND vu.user_id = ?
       )
     ORDER BY v.created_at DESC`,
    [userId, userId]
  );
  return rows;
}

export async function findVoucherForCheckout(code: string, userId: number | null) {
  const pool = getPool();
  const normalized = code.trim().toUpperCase();
  const [[voucher]] = await pool.query<RowDataPacket[]>(
    `SELECT *
     FROM vouchers
     WHERE code = ?
     LIMIT 1`,
    [normalized]
  );
  if (!voucher) {
    throw new Error("Voucher không tồn tại.");
  }
  if (!voucher.is_active) {
    throw new Error("Voucher đang tắt.");
  }
  if (voucher.expires_at && new Date(voucher.expires_at).getTime() < Date.now()) {
    throw new Error("Voucher đã hết hạn.");
  }
  if (voucher.assigned_user_id && userId && Number(voucher.assigned_user_id) !== userId) {
    throw new Error("Voucher không áp dụng cho tài khoản này.");
  }
  if (userId) {
    const [[used]] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM voucher_usages WHERE user_id = ? AND code = ? LIMIT 1`,
      [userId, normalized]
    );
    if (used) {
      throw new Error("Voucher đã được sử dụng.");
    }
  }
  return voucher;
}

export async function listAllVouchers() {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT v.*, u.full_name AS assigned_user_name
     FROM vouchers v
     LEFT JOIN users u ON u.id = v.assigned_user_id
     ORDER BY v.created_at DESC`
  );
  return rows;
}

export async function createVoucher(payload: VoucherPayload) {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO vouchers
      (code, title, description, discount_type, discount_value, min_order_value, max_discount_value, assigned_user_id, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.code.trim().toUpperCase(),
      payload.title.trim(),
      payload.description ?? null,
      payload.discountType,
      payload.discountValue,
      payload.minOrderValue,
      payload.maxDiscountValue ?? null,
      payload.assignedUserId ?? null,
      payload.expiresAt ?? null,
      payload.isActive === false ? 0 : 1,
    ]
  );
  return result.insertId;
}

export async function updateVoucher(code: string, payload: VoucherPayload) {
  const pool = getPool();
  await pool.execute(
    `UPDATE vouchers
     SET code = ?, title = ?, description = ?, discount_type = ?, discount_value = ?, min_order_value = ?, max_discount_value = ?, assigned_user_id = ?, expires_at = ?, is_active = ?
     WHERE code = ?`,
    [
      payload.code.trim().toUpperCase(),
      payload.title.trim(),
      payload.description ?? null,
      payload.discountType,
      payload.discountValue,
      payload.minOrderValue,
      payload.maxDiscountValue ?? null,
      payload.assignedUserId ?? null,
      payload.expiresAt ?? null,
      payload.isActive === false ? 0 : 1,
      code.trim().toUpperCase(),
    ]
  );
}

export async function deleteVoucher(code: string) {
  const pool = getPool();
  await pool.execute(`DELETE FROM vouchers WHERE code = ?`, [code.trim().toUpperCase()]);
}

export async function consumeVoucherIfNeeded(bookingId: number) {
  const pool = getPool();
  const [[booking]] = await pool.query<RowDataPacket[]>(
    `SELECT id, user_id, voucher_code, discount_amount
     FROM bookings
     WHERE id = ?
     LIMIT 1`,
    [bookingId]
  );
  if (!booking?.voucher_code || Number(booking.discount_amount) <= 0) {
    return;
  }

  const [[voucher]] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM vouchers WHERE code = ? LIMIT 1`,
    [booking.voucher_code]
  );
  if (!voucher) return;

  await pool.execute(
    `INSERT IGNORE INTO voucher_usages (voucher_id, booking_id, user_id, code, discount_amount)
     VALUES (?, ?, ?, ?, ?)`,
    [
      voucher.id,
      bookingId,
      booking.user_id ?? null,
      booking.voucher_code,
      booking.discount_amount,
    ]
  );
}
