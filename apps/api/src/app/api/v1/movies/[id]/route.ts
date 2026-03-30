import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteMovie, updateMovie } from "@/lib/crud";
import { asObject, v } from "@/lib/validation";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = asObject(await request.json());
    await updateMovie(Number(id), {
      slug: v.string(body.slug, "Slug", { min: 2, max: 150 }),
      title: v.string(body.title, "Ten phim", { min: 2, max: 180 }),
      subtitle: v.optionalString(body.subtitle, "Subtitle", { max: 255 }),
      synopsis: v.optionalString(body.synopsis, "Tom tat", { max: 4000 }),
      genre: v.string(body.genre, "The loai", { min: 2, max: 120 }),
      durationMinutes: v.number(body.durationMinutes, "Thoi luong", { integer: true, min: 30, max: 400 }),
      releaseDate: v.optionalString(body.releaseDate, "Ngay khoi chieu", { max: 20 }),
      status: v.oneOf(body.status, ["COMING_SOON", "NOW_SHOWING", "TRENDING"], "Trang thai"),
      rating: v.number(body.rating, "Diem danh gia", { min: 0, max: 10 }),
      badge: v.optionalString(body.badge, "Badge", { max: 80 }),
      posterUrl: v.optionalString(body.posterUrl, "Poster", { max: 1000 }),
      bannerUrl: v.optionalString(body.bannerUrl, "Banner", { max: 1000 }),
      highlightColor: v.optionalString(body.highlightColor, "Mau noi bat", { max: 20 }),
      isFeatured: body.isFeatured === undefined ? false : v.boolean(body.isFeatured, "Noi bat"),
      boxOfficeRank: body.boxOfficeRank === null || body.boxOfficeRank === undefined ? null : v.number(body.boxOfficeRank, "Thu hang", { integer: true, min: 1, max: 999 }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the cap nhat phim" },
      { status: 409 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    await deleteMovie(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the xoa phim" },
      { status: 409 }
    );
  }
}
