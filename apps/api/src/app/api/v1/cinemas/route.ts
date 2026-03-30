import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createCinema, listCinemas } from "@/lib/crud";

export async function GET() {
  return NextResponse.json({ cinemas: await listCinemas() });
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const id = await createCinema(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tao rap" },
      { status: 409 }
    );
  }
}
