import { NextResponse } from "next/server";
import { getCatalogData } from "@/lib/catalog";

export async function GET() {
  const catalog = await getCatalogData();
  return NextResponse.json(catalog);
}
