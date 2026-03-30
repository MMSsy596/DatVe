import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dispatchDueReminders } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const sent = await dispatchDueReminders();
    return NextResponse.json({ sent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the dispatch reminder" },
      { status: 400 }
    );
  }
}
