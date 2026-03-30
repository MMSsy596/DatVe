import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth";
import { listReminders } from "@/lib/operations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionUser = await resolveSessionUser(request);
  const userId = Number(sessionUser?.id ?? searchParams.get("userId") ?? 2);
  return NextResponse.json({ reminders: await listReminders(userId) });
}
