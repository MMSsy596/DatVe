import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveUploadedImage } from "@/lib/media";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      throw new Error("Cần gửi file ảnh.");
    }

    const normalizedFolder =
      folder === "movies" || folder === "banners" || folder === "shared" ? folder : "shared";
    const saved = await saveUploadedImage(file, normalizedFolder);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload thất bại" },
      { status: 400 }
    );
  }
}
