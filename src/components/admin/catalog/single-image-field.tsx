"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { IMAGE_ACCEPT, uploadImage, type StorageBucket } from "@/lib/image-upload";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";

/** One picture (category photo, brand logo): upload, replace or remove. The value is the public URL. */
export function SingleImageField({
  value,
  onChange,
  bucket,
  folder,
  maxSize = 800,
  label = "Photo",
  hint,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: StorageBucket;
  folder: string;
  maxSize?: number;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const uploaded = await uploadImage(file, bucket, folder, { maxSize });
      onChange(uploaded.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">{label}</p>
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-line bg-[#f3f5f4]">
          {value ? (
            <ProductImage src={value} alt="" sizes="96px" className="p-2" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-subtle">
              <ImagePlus className="size-7" />
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="size-5 animate-spin text-canopy" />
            </span>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-flag"
            >
              <Trash2 className="size-3.5" /> Remove
            </button>
          )}
        </div>
      </div>
      {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
