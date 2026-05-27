import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { asObject, v } from "@/lib/validation";

// GET /api/v1/admin/users - Danh sách users
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, avatar_url, created_at
       FROM users ORDER BY created_at DESC LIMIT 100`
    );
    return NextResponse.json({ users: rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi server" },
      { status: 401 }
    );
  }
}

// PATCH /api/v1/admin/users - Cập nhật role user
export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const pool = getPool();
    const body = asObject(await request.json());
    const userId = v.number(body.userId, "User ID");
    const role = v.string(body.role, "Role");
    if (!["USER", "ADMIN", "STAFF"].includes(role)) {
      throw new Error("Role không hợp lệ. Chọn: USER, ADMIN, STAFF");
    }
    await pool.execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
    return NextResponse.json({ success: true, userId, role });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi server" },
      { status: 400 }
    );
  }
}
