"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveBanner } from "@/app/admin/banners/actions";
import { BANNER_THEMES } from "@/lib/admin/banners";
import { IMAGE_ACCEPT, uploadImage } from "@/lib/image-upload";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/admin/toggle";
import { Panel } from "@/components/admin/ui";
import { BannerSlide } from "@/components/store/hero-carousel";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { DeleteBannerButton } from "./banner-row-controls";

export interface BannerFormValues {
  id?: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  linkUrl: string;
  imageUrl: string;
  storagePath: string | null;
  placement: Banner["placement"];
  layout: Banner["layout"];
  theme: Banner["theme"];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export function BannerForm({ initial, timeZone }: { initial: BannerFormValues; timeZone: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof BannerFormValues>(key: K, value: BannerFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (error?.field === key) setError(null);
  };
  const fieldError = (key: string) => (error?.field === key ? error.message : undefined);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadImage(file, "site-assets", "banners", { maxSize: 2000, quality: 0.85 });
      setValues((v) => ({ ...v, imageUrl: uploaded.url, storagePath: uploaded.path }));
      if (error?.field === "imageUrl") setError(null);
      if (values.layout === "cover" && uploaded.width < 1400) {
        toast.warning("This image is narrow for a full-width banner. Use one at least 1600px wide, or switch to the split layout.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const preview: Banner = {
    id: values.id ?? "preview",
    title: values.title || "Your headline here",
    subtitle: values.subtitle || null,
    cta_label: values.ctaLabel || null,
    link_url: values.linkUrl || "#",
    image_url: values.imageUrl,
    placement: values.placement,
    layout: values.layout,
    theme: values.theme,
  };

  return (
    <form
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await saveBanner(values);
          if (!result.ok) {
            setError({ message: result.error, field: result.field });
            toast.error(result.error);
            return;
          }
          toast.success(result.message ?? "Saved");
          router.push("/admin/banners");
        });
      }}
    >
      <div className="space-y-6">
        <Panel title="Preview" description="How the banner looks on the homepage. Buttons don't work in the preview.">
          <div
            className={cn(
              "pointer-events-none overflow-hidden rounded-[20px]",
              values.placement === "hero" ? "h-[300px] sm:h-[360px]" : "mx-auto h-[210px] max-w-[460px]",
            )}
            aria-hidden
          >
            {values.imageUrl ? (
              <BannerSlide banner={preview} compact={values.placement === "promo"} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-mist text-muted">
                <ImagePlus className="size-8" />
                <span className="text-sm">Upload an image to see the preview</span>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Words and link">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Headline" htmlFor="banner-title" error={fieldError("title")} className="sm:col-span-2">
              <Input
                id="banner-title"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={120}
                placeholder="Back-to-school deals"
                aria-invalid={Boolean(fieldError("title"))}
              />
            </Field>
            <Field label="Subtitle" htmlFor="banner-subtitle" hint="Optional — one short sentence" error={fieldError("subtitle")} className="sm:col-span-2">
              <Input
                id="banner-subtitle"
                value={values.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
                maxLength={240}
                placeholder="Save up to 30% on bags, shoes and stationery"
              />
            </Field>
            <Field label="Button label" htmlFor="banner-cta" hint="Defaults to “Shop now”" error={fieldError("ctaLabel")}>
              <Input id="banner-cta" value={values.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} maxLength={40} />
            </Field>
            <Field
              label="Link"
              htmlFor="banner-link"
              hint="A page on this site like /deals or /c/phones, or a full web address"
              error={fieldError("linkUrl")}
            >
              <Input
                id="banner-link"
                value={values.linkUrl}
                onChange={(e) => set("linkUrl", e.target.value)}
                placeholder="/deals"
                aria-invalid={Boolean(fieldError("linkUrl"))}
              />
            </Field>
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Image">
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" id="banner-file" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {uploading ? "Uploading…" : values.imageUrl ? "Replace image" : "Upload image"}
            </Button>
            {fieldError("imageUrl") && <span className="text-[13px] font-medium text-flag">{fieldError("imageUrl")}</span>}
          </div>
          <p className="mt-3 text-[13px] text-muted">
            <strong className="text-ink">Split</strong> suits product photos on a white background.{" "}
            <strong className="text-ink">Cover</strong> suits wide lifestyle photos at least 1600px wide. Images are resized
            automatically.
          </p>
        </Panel>

        <Panel title="Style">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Layout</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["split", "cover"] as const).map((layout) => (
                <label
                  key={layout}
                  className={cn(
                    "cursor-pointer rounded-xl border-2 p-3 text-[13.5px]",
                    values.layout === layout ? "border-canopy bg-canopy-50/60" : "border-line hover:border-line-strong",
                  )}
                >
                  <input type="radio" name="layout" className="sr-only" checked={values.layout === layout} onChange={() => set("layout", layout)} />
                  <span className="block font-bold text-ink">{layout === "split" ? "Split" : "Cover"}</span>
                  <span className="text-muted">{layout === "split" ? "Text beside the photo" : "Text over the photo"}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-semibold text-ink">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {BANNER_THEMES.map((t) => (
                <label key={t.value} className="cursor-pointer" title={t.label}>
                  <input type="radio" name="theme" className="peer sr-only" checked={values.theme === t.value} onChange={() => set("theme", t.value)} />
                  <span
                    className="block size-10 rounded-full ring-1 ring-black/15 transition peer-checked:ring-2 peer-checked:ring-ink peer-checked:ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-canopy"
                    style={{ background: t.swatch }}
                  />
                  <span className="sr-only">{t.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-muted">{BANNER_THEMES.find((t) => t.value === values.theme)?.label}</p>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-semibold text-ink">Where it appears</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["hero", "promo"] as const).map((placement) => (
                <label
                  key={placement}
                  className={cn(
                    "cursor-pointer rounded-xl border-2 p-3 text-[13.5px]",
                    values.placement === placement ? "border-canopy bg-canopy-50/60" : "border-line hover:border-line-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="placement"
                    className="sr-only"
                    checked={values.placement === placement}
                    onChange={() => set("placement", placement)}
                  />
                  <span className="block font-bold text-ink">{placement === "hero" ? "Hero carousel" : "Promo tile"}</span>
                  <span className="text-muted">{placement === "hero" ? "Top of the homepage" : "Smaller, further down"}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Panel>

        <Panel title="Schedule" description={`Optional. Times are in the store's timezone (${timeZone}).`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Field label="Show from" htmlFor="banner-starts" error={fieldError("startsAt")}>
              <Input id="banner-starts" type="datetime-local" value={values.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
            </Field>
            <Field label="Hide after" htmlFor="banner-ends" error={fieldError("endsAt")}>
              <Input id="banner-ends" type="datetime-local" value={values.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
            </Field>
          </div>
          <Toggle
            className="mt-5"
            label="Show on the homepage"
            description="Turn off to hide the banner without deleting it."
            checked={values.isActive}
            onChange={(v) => set("isActive", v)}
          />
        </Panel>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="lg" disabled={pending || uploading}>
            {pending ? "Saving…" : values.id ? "Save banner" : "Create banner"}
          </Button>
          <Button variant="ghost" onClick={() => router.push("/admin/banners")}>
            Cancel
          </Button>
          {values.id && (
            <span className="ml-auto">
              <DeleteBannerButton id={values.id} onDeleted={() => router.push("/admin/banners")} />
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
