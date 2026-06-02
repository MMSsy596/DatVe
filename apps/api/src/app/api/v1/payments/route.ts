import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createPaymentLink } from "@/lib/payments";
import { normalizeOrigin, safeRedirectUrl } from "@/lib/security";
import { asObject, v } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = asObject(await request.json());
    const headerStore = await headers();
    const origin = normalizeOrigin(headerStore.get("origin"), headerStore.get("host"));
    const payment = await createPaymentLink({
      bookingId: v.number(body.bookingId, "Booking", { integer: true, min: 1 }),
      provider: v.oneOf(body.provider, ["MOMO", "ZALOPAY", "VNPAY"], "Cong thanh toan"),
      origin,
      returnUrl: safeRedirectUrl(
        v.optionalString(body.returnUrl, "Return URL", { max: 512 }) ?? "cineplus://payment-result",
        "cineplus://payment-result"
      ),
      ipAddr:
        headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headerStore.get("x-real-ip") ??
        "127.0.0.1",
      gatewayMode: v.optionalString(body.gatewayMode, "Gateway mode", { max: 20 }),
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tao payment" },
      { status: 409 }
    );
  }
}
