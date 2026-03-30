import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/security";
import { asObject, v } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth-login", 8, 5 * 60 * 1000);
    const body = asObject(await request.json());
    const session = await loginUser({
      email: v.email(body.email),
      password: v.password(body.password),
      deviceName: v.optionalString(body.deviceName, "Ten thiet bi", { max: 120 }) ?? "React Native",
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dang nhap that bai" },
      { status: 401 }
    );
  }
}
