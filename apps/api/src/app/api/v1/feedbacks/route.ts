import { NextRequest, NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth";
import { createFeedback, listFeedbacks } from "@/lib/feedbacks";
import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { v } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Vui lòng đăng nhập để thực hiện tác vụ này." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const type = searchParams.get("type") || undefined;
    const cinemaIdParam = searchParams.get("cinemaId");
    const cinemaId = cinemaIdParam ? Number(cinemaIdParam) : undefined;

    let staffCinemaId: number | null = null;
    if (sessionUser.role === "STAFF") {
      // Truy vấn cinema_id của STAFF từ DB
      const pool = getPool();
      const [users] = await pool.query<RowDataPacket[]>(
        "SELECT cinema_id FROM users WHERE id = ? LIMIT 1",
        [sessionUser.id]
      );
      if (users[0] && users[0].cinema_id !== null) {
        staffCinemaId = Number(users[0].cinema_id);
      }
    }

    const feedbacks = await listFeedbacks(
      sessionUser.role as "USER" | "ADMIN" | "STAFF",
      sessionUser.id,
      staffCinemaId,
      { status, type, cinemaId }
    );

    return NextResponse.json({ feedbacks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Đã xảy ra lỗi hệ thống." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Vui lòng đăng nhập để gửi góp ý." }, { status: 401 });
    }

    const body = await request.json();

    // Validate inputs
    const type = v.string(body.type, "Loại góp ý") as "SERVICE" | "CINEMA" | "TICKET" | "OTHER";
    if (!["SERVICE", "CINEMA", "TICKET", "OTHER"].includes(type)) {
      return NextResponse.json({ error: "Loại góp ý không hợp lệ." }, { status: 400 });
    }

    const title = v.string(body.title, "Tiêu đề").trim();
    if (!title) {
      return NextResponse.json({ error: "Vui lòng nhập tiêu đề góp ý." }, { status: 400 });
    }

    const content = v.string(body.content, "Nội dung góp ý").trim();
    if (!content) {
      return NextResponse.json({ error: "Vui lòng nhập nội dung góp ý." }, { status: 400 });
    }

    const cinemaId = body.cinemaId ? Number(body.cinemaId) : null;
    const bookingId = body.bookingId ? Number(body.bookingId) : null;
    const imageUrl = body.imageUrl ? v.string(body.imageUrl, "Ảnh đính kèm").trim() : null;

    const feedbackId = await createFeedback(sessionUser.id, {
      type,
      cinemaId,
      bookingId,
      title,
      content,
      imageUrl,
    });

    return NextResponse.json(
      { success: true, feedbackId, message: "Gửi góp ý thành công!" },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể gửi góp ý." },
      { status: 500 }
    );
  }
}
