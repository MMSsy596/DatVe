import { NextRequest, NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth";
import { getFeedbackDetail, respondFeedback } from "@/lib/feedbacks";
import { getPool } from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { v } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await resolveSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Vui lòng đăng nhập để thực hiện tác vụ này." }, { status: 401 });
    }

    const { id } = await params;
    const feedbackId = Number(id);

    const feedback = await getFeedbackDetail(feedbackId);
    if (!feedback) {
      return NextResponse.json({ error: "Không tìm thấy góp ý này." }, { status: 404 });
    }

    // Phân quyền xem chi tiết
    if (sessionUser.role === "USER" && feedback.userId !== sessionUser.id) {
      return NextResponse.json({ error: "Bạn không có quyền xem góp ý này." }, { status: 403 });
    }

    if (sessionUser.role === "STAFF") {
      const pool = getPool();
      const [users] = await pool.query<RowDataPacket[]>(
        "SELECT cinema_id FROM users WHERE id = ? LIMIT 1",
        [sessionUser.id]
      );
      const staffCinemaId = users[0]?.cinema_id ? Number(users[0].cinema_id) : null;
      if (!staffCinemaId || feedback.cinemaId !== staffCinemaId) {
        return NextResponse.json({ error: "Góp ý này không thuộc rạp bạn quản lý." }, { status: 403 });
      }
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Đã xảy ra lỗi hệ thống." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await resolveSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Vui lòng đăng nhập để thực hiện tác vụ này." }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN" && sessionUser.role !== "STAFF") {
      return NextResponse.json({ error: "Bạn không có quyền phản hồi góp ý." }, { status: 403 });
    }

    const { id } = await params;
    const feedbackId = Number(id);

    const feedback = await getFeedbackDetail(feedbackId);
    if (!feedback) {
      return NextResponse.json({ error: "Không tìm thấy góp ý này." }, { status: 404 });
    }

    // Nếu là STAFF, kiểm tra xem góp ý có thuộc rạp quản lý không
    if (sessionUser.role === "STAFF") {
      const pool = getPool();
      const [users] = await pool.query<RowDataPacket[]>(
        "SELECT cinema_id FROM users WHERE id = ? LIMIT 1",
        [sessionUser.id]
      );
      const staffCinemaId = users[0]?.cinema_id ? Number(users[0].cinema_id) : null;
      if (!staffCinemaId || feedback.cinemaId !== staffCinemaId) {
        return NextResponse.json({ error: "Góp ý này không thuộc rạp bạn quản lý." }, { status: 403 });
      }
    }

    const body = await request.json();
    const responseContent = v.string(body.responseContent, "Nội dung phản hồi").trim();
    if (!responseContent) {
      return NextResponse.json({ error: "Vui lòng nhập nội dung phản hồi." }, { status: 400 });
    }

    const status = v.string(body.status, "Trạng thái") as "PROCESSING" | "RESOLVED" | "REJECTED";
    if (!["PROCESSING", "RESOLVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái cập nhật không hợp lệ." }, { status: 400 });
    }

    await respondFeedback(feedbackId, sessionUser.id, responseContent, status);

    return NextResponse.json({ success: true, message: "Phản hồi góp ý thành công!" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể phản hồi góp ý." },
      { status: 500 }
    );
  }
}
