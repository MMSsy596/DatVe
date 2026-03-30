import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createFood, listFoods } from "@/lib/crud";

export async function GET() {
  return NextResponse.json({ foods: await listFoods() });
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const id = await createFood(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tao combo" },
      { status: 409 }
    );
  }
}
