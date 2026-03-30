import { NextResponse } from "next/server";
import { logoutToken, readBearerToken } from "@/lib/auth";

export async function POST(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Khong tim thay session." }, { status: 400 });
  }
  await logoutToken(token);
  return NextResponse.json({ ok: true });
}
