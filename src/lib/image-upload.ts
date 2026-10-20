"use client";

import { createClient } from "./supabase/client";

export type StorageBucket = "product-images" | "site-assets";

export interface UploadedImage {
  url: string;
  path: string;
  width: number;
  height: number;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/heic", "image/heif"];
export const IMAGE_ACCEPT = ACCEPTED.join(",");
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/**
 * Shrinks a photo in the browser before upload so pages load fast on mobile
 * data: longest side capped (1600px by default), re-encoded as WebP (JPEG
 * where the browser can't encode WebP). Orientation from the camera is kept.
 */
export async function resizeImage(
  file: File,
  { maxSize = 1600, quality = 0.84 }: { maxSize?: number; quality?: number } = {},
): Promise<{ blob: Blob; width: number; height: number; extension: "webp" | "jpg" }> {
  if (file.size > MAX_INPUT_BYTES) throw new Error(`${file.name} is larger than 25 MB.`);
  if (file.type && !ACCEPTED.includes(file.type)) throw new Error(`${file.name} isn't a supported image type.`);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`${file.name} couldn't be read. Try saving it as a JPEG or PNG.`);
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images. Try another browser.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, quality));

  const webp = await encode("image/webp");
  if (webp && webp.type === "image/webp") return { blob: webp, width, height, extension: "webp" };
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error(`${file.name} couldn't be converted.`);
  return { blob: jpeg, width, height, extension: "jpg" };
}

/** Resizes then uploads to a public storage bucket. Returns the public URL and storage path. */
export async function uploadImage(
  file: File,
  bucket: StorageBucket,
  folder: string,
  options?: { maxSize?: number; quality?: number },
): Promise<UploadedImage> {
  const { blob, width, height, extension } = await resizeImage(file, options);
  const path = `${folder.replace(/^\/+|\/+$/g, "")}/${crypto.randomUUID()}.${extension}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    throw new Error(
      /row-level security|unauthorized/i.test(error.message)
        ? "You don't have permission to upload images."
        : `Upload failed: ${error.message}`,
    );
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path, width, height };
}
