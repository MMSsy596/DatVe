import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { registerPushToken } from "@/lib/notifications";
import { asObject, v } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireSession(request);
    const body = asObject(await request.json());
    const expoPushToken = v.string(body.expoPushToken, "Expo push token", { min: 10, max: 255 });
    if (
      !expoPushToken.startsWith("ExponentPushToken[") &&
      !expoPushToken.startsWith("ExpoPushToken[")
    ) {
      throw new Error("Expo push token không hợp lệ.");
    }

    await registerPushToken({
      userId: user.id,
      expoPushToken,
      deviceId: v.optionalString(body.deviceId, "Mã thiết bị", { max: 120 }),
      platform: v.optionalString(body.platform, "Nền tảng", { max: 20 }),
      appVersion: v.optionalString(body.appVersion, "Phiên bản ứng dụng", { max: 40 }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể đăng ký push token" },
      { status: 400 }
    );
  }
}
