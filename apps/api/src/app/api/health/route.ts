import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");

    return NextResponse.json({
      service: "cineplus-api",
      status: "ok",
      database: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        service: "cineplus-api",
        status: "degraded",
        database: "error",
        message: error instanceof Error ? error.message : "Không kiểm tra được database.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
