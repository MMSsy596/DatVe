import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  await pool.query("SELECT 1");

  return NextResponse.json({
    service: "phimbook-api",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
