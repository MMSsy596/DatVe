import fs from "node:fs/promises";
import path from "node:path";
import { ensureRuntimeSchema } from "./db";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export async function saveUploadedImage(file: File, folder: "movies" | "banners" | "shared") {
  await ensureRuntimeSchema();

  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) {
    throw new Error("Chi chap nhan file JPG, PNG hoac WEBP.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File qua lon. Gioi han 5MB.");
  }

  const uploadRoot = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(uploadRoot, { recursive: true });

  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
  const targetPath = path.join(uploadRoot, safeName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(targetPath, bytes);
  return {
    fileName: safeName,
    url: `/uploads/${folder}/${safeName}`,
    size: file.size,
    contentType: file.type,
  };
}

