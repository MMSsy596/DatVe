import { NextResponse } from "next/server";
import { generateAssistantReply } from "@/lib/ai-assistant";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body?.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Thiếu nội dung câu hỏi cho AI." }, { status: 400 });
    }

    const result = await generateAssistantReply({
      message,
      context: body?.context ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể xử lý yêu cầu AI." },
      { status: 500 }
    );
  }
}
