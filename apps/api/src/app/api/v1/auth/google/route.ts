import { NextResponse } from "next/server";
import { loginWithGoogle } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/security";
import { asObject, v } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth-google", 10, 5 * 60 * 1000);
    const body = asObject(await request.json());
    const session = await loginWithGoogle({
      idToken: v.string(body.idToken, "Google id_token", { min: 20, max: 4096, trim: false }),
      deviceName: v.optionalString(body.deviceName, "Tên thiết bị", { max: 120 }) ?? "Google Sign-In",
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Đăng nhập Google thất bại" },
      { status: 401 }
    );
  }
}
