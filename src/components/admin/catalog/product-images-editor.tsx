"use client";

import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Loader2, Star, Trash2, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { discardUploadedImages } from "@/app/admin/products/actions";
import { IMAGE_ACCEPT, uploadImage } from "@/lib/image-upload";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/store/product-image";

export interface EditorImage {
  key: string;
  id?: string;
  url: string;
  storagePath: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  status: "ready" | "uploading" | "error";
  previewUrl?: string;
  error?: string;
  /** Uploaded in this session and not saved yet. */
  isNew: boolean;
}

const MAX_IMAGES = 20;

/**
 * Photo manager: upload several at once (resized in the browser), drag or use
 * the arrows to reorder, edit alt text, remove. The first photo is the main one.
 */
export function ProductImagesEditor({
  images,
  onChange,
  folder,
}: {
  images: EditorImage[];
  onChange: (update: (prev: EditorImage[]) => EditorImage[]) => void;
  /** Storage folder, e.g. products/<id>. Called lazily so new products get a draft folder on first upload. */
  folder: () => string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`Products can have up to ${MAX_IMAGES} photos.`);
      return;
    }
    const accepted = files.slice(0, room);
    if (accepted.length < files.length) toast.info(`Only the first ${room} photos were added (limit ${MAX_IMAGES}).`);

    const entries: EditorImage[] = accepted.map((file) => ({
      key: crypto.randomUUID(),
      url: "",
      storagePath: null,
      alt: "",
      width: null,
      height: null,
      status: "uploading",
      previewUrl: URL.createObjectURL(file),
      isNew: true,
    }));
    onChange((prev) => [...prev, ...entries]);

    const target = folder();
    // Upload a few at a time so phones on mobile data aren't overwhelmed.
    const queue = accepted.map((file, i) => ({ file, key: entries[i].key }));
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { file, key } = job;
        try {
          const uploaded = await uploadImage(file, "product-images", target);
          onChange((prev) =>
            prev.map((img) =>
              img.key === key
                ? { ...img, url: uploaded.url, storagePath: uploaded.path, width: uploaded.width, height: uploaded.height, status: "ready" }
                : img,
            ),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed.";
          onChange((prev) => prev.map((img) => (img.key === key ? { ...img, status: "error", error: message } : img)));
          toast.error(message);
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    onChange((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function remove(key: string) {
    const image = images.find((i) => i.key === key);
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    onChange((prev) => prev.filter((i) => i.key !== key));
    // Files uploaded in this session aren't attached to anything yet: clean them up now.
    if (image?.isNew && image.storagePath) void discardUploadedImages([image.storagePath]);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDropActive(true);
          }
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            setDropActive(false);
            void addFiles(e.dataTransfer.files);
          }
        }}
        className={cn(
          "grid grid-cols-2 gap-3 rounded-xl sm:grid-cols-3 lg:grid-cols-4",
          dropActive && "outline-2 outline-offset-4 outline-dashed outline-canopy",
        )}
      >
        {images.map((image, index) => (
          <div
            key={image.key}
            draggable={image.status === "ready"}
            onDragStart={(e) => {
              setDragIndex(index);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (dragIndex !== null) {
                e.preventDefault();
                setOverIndex(index);
              }
            }}
            onDrop={(e) => {
              if (dragIndex !== null) {
                e.preventDefault();
                move(dragIndex, index);
              }
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-xl border bg-white transition",
              index === 0 ? "border-gold ring-1 ring-gold" : "border-line",
              overIndex === index && dragIndex !== null && dragIndex !== index && "ring-2 ring-canopy",
              dragIndex === index && "opacity-50",
            )}
          >
            <div className="relative aspect-square bg-[#f3f5f4]">
              {image.status === "ready" ? (
                <ProductImage src={image.url} alt={image.alt || "Product photo"} sizes="200px" className="p-2" />
              ) : image.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview while uploading
                <img src={image.previewUrl} alt="" className="absolute inset-0 size-full object-contain p-2 opacity-60" />
              ) : null}
              {image.status === "uploading" && (
                <span className="absolute inset-0 flex items-center justify-center gap-2 bg-white/50 text-[13px] font-semibold text-ink">
                  <Loader2 className="size-4 animate-spin" /> Uploading…
                </span>
              )}
              {image.status === "error" && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-flag-50/90 p-3 text-center text-[12px] font-semibold text-flag-600">
                  <TriangleAlert className="size-5" />
                  {image.error ?? "Upload failed"}
                </span>
              )}
              {index === 0 && image.status === "ready" && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-ink">
                  <Star className="size-3 fill-current" /> Main photo
                </span>
              )}
              {image.status === "ready" && (
                <span className="absolute right-2 top-2 hidden rounded-md bg-white/90 p-1 text-muted shadow-sm group-hover:block" aria-hidden>
                  <GripVertical className="size-4" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 border-t border-line p-1.5">
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-mist hover:text-ink disabled:opacity-30"
                aria-label="Move photo earlier"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === images.length - 1}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-mist hover:text-ink disabled:opacity-30"
                aria-label="Move photo later"
              >
                <ArrowRight className="size-4" />
              </button>
              <input
                type="text"
                value={image.alt}
                onChange={(e) => onChange((prev) => prev.map((i) => (i.key === image.key ? { ...i, alt: e.target.value } : i)))}
                placeholder="Describe photo"
                aria-label={`Description of photo ${index + 1}`}
                maxLength={200}
                className="h-8 min-w-0 flex-1 rounded-lg border border-transparent px-2 text-[12.5px] outline-none hover:border-line focus:border-canopy"
              />
              <button
                type="button"
                onClick={() => remove(image.key)}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-flag-50 hover:text-flag"
                aria-label={`Remove photo ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-white text-center text-[13px] font-semibold text-muted transition hover:border-canopy hover:text-canopy"
          >
            <ImagePlus className="size-7" />
            Add photos
            <span className="px-3 text-[11.5px] font-normal">or drag them here</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="mt-3 text-[12.5px] text-muted">
        Photos are resized automatically for fast loading. The first photo is shown in search results — drag to reorder.
        Square photos on a plain background look best.
      </p>
    </div>
  );
}
