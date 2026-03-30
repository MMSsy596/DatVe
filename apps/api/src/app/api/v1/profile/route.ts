import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/crud";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionUser = await resolveSessionUser(request);
  const userId = Number(sessionUser?.id ?? searchParams.get("userId") ?? "2");
  const profile = await getUserProfile(userId);

  if (!profile) {
    return NextResponse.json({ error: "Khong tim thay nguoi dung" }, { status: 404 });
  }

  return NextResponse.json(profile);
}
