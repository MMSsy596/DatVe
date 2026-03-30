import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/security";
import { asObject, v } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth-register", 5, 15 * 60 * 1000);
    const body = asObject(await request.json());
    const session = await registerUser({
      fullName: v.string(body.fullName, "Ho ten", { min: 2, max: 120 }),
      email: v.email(body.email),
      password: v.password(body.password),
      phone: v.optionalString(body.phone, "So dien thoai", { max: 30 }) ?? "",
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dang ky that bai" },
      { status: 409 }
    );
  }
}
