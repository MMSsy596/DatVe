import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteBanner, updateBanner } from "@/lib/crud";
import { asObject, v } from "@/lib/validation";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = asObject(await request.json());
    await updateBanner(Number(id), {
      title: v.string(body.title, "Tieu de", { min: 2, max: 150 }),
      eyebrow: v.optionalString(body.eyebrow, "Eyebrow", { max: 120 }),
      subtitle: v.string(body.subtitle, "Mo ta", { min: 2, max: 255 }),
      accentColor: v.optionalString(body.accentColor, "Mau nhan", { max: 20 }),
      imageUrl: v.optionalString(body.imageUrl, "Anh banner", { max: 1000 }),
      sortOrder: v.number(body.sortOrder ?? 0, "Thu tu", { integer: true, min: 0, max: 9999 }),
      isActive: body.isActive === undefined ? true : v.boolean(body.isActive, "Trang thai"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the cap nhat banner" },
      { status: 409 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    await deleteBanner(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the xoa banner" },
      { status: 409 }
    );
  }
}
