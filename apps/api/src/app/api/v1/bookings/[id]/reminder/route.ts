import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { cancelReminder, upsertReminder } from "@/lib/operations";
import { asObject, v } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(request);
    const { id } = await context.params;
    const body = asObject(await request.json());
    await upsertReminder(
      Number(id),
      user.id,
      v.dateTime(body.remindAt, "Thoi gian reminder")
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tao reminder" },
      { status: 409 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(request);
    const { id } = await context.params;
    await cancelReminder(Number(id), user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the huy reminder" },
      { status: 409 }
    );
  }
}
