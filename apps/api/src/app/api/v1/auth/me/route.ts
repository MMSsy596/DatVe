import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireSession(request);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
