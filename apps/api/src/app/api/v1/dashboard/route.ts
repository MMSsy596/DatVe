import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats } from "@/lib/crud";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
