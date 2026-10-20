"use client";

/* eslint-disable @next/next/no-img-element -- logo preview of an uploaded file */
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { saveSettings, type SettingsInput } from "@/app/admin/settings/actions";
import { formatPrice } from "@/lib/format";
import { IMAGE_ACCEPT, uploadImage } from "@/lib/image-upload";
import { Toggle } from "@/components/admin/toggle";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Textarea } from "@/components/ui/field";

export type SettingsFormValues = Omit<SettingsInput, "lowStockThreshold"> & { lowStockThreshold: string };

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof SettingsFormValues>(key: K, value: SettingsFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (error?.field === key) setError(null);
  };
  const fieldError = (key: keyof SettingsFormValues) => (error?.field === key ? error.message : undefined);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadImage(file, "site-assets", "branding", { maxSize: 600, quality: 0.9 });
      set("logoUrl", uploaded.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveSettings({
        ...values,
        lowStockThreshold: Math.max(0, Math.round(Number(values.lowStockThreshold) || 0)),
      });
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        toast.error(result.error);
        if (result.field) {
          document.getElementById(`settings-${result.field}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
      setSaved(values);
      toast.success(result.message ?? "Settings saved");
    });
  }

  const text = (key: keyof SettingsFormValues, label: string, props: { hint?: ReactNode; placeholder?: string; maxLength?: number; type?: string; className?: string; inputMode?: "numeric" | "tel" | "email" } = {}) => (
    <Field label={label} htmlFor={`settings-${key}`} hint={props.hint} error={fieldError(key)} className={props.className}>
      <Input
        id={`settings-${key}`}
        type={props.type ?? "text"}
        inputMode={props.inputMode}
        value={String(values[key] ?? "")}
        onChange={(e) => set(key, e.target.value as never)}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        aria-invalid={Boolean(fieldError(key))}
      />
    </Field>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-6 pb-24"
    >
      <Panel title="Store" description="Shown in the header, footer, emails and browser tab.">
        <div className="grid gap-4 md:grid-cols-2">
          {text("storeName", "Store name", { maxLength: 60 })}
          {text("tagline", "Tagline", { hint: "One line about the store, used in the footer and search results.", maxLength: 160 })}
          <div className="md:col-span-2">
            <p className="mb-1.5 text-sm font-semibold text-ink">Logo</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 min-w-40 items-center justify-center rounded-xl bg-ink px-4">
                {values.logoUrl ? (
                  <img src={values.logoUrl} alt="Current logo" className="h-10 w-auto max-w-[160px] object-contain" />
                ) : (
                  <span className="display text-lg font-black uppercase text-white">{values.storeName.split(" ")[0] || "Logo"}</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {values.logoUrl ? "Replace logo" : "Upload logo"}
              </Button>
              {values.logoUrl && (
                <Button variant="ghost" onClick={() => set("logoUrl", null)}>
                  <Trash2 className="size-4" /> Use the text logo
                </Button>
              )}
            </div>
            <p className="mt-2 text-[13px] text-muted">
              A wide logo with a transparent background works best on the dark header. Without one, the store name is shown.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Contact details" description="Shown in the footer, on the contact page and in order emails.">
        <div className="grid gap-4 md:grid-cols-2">
          {text("contactEmail", "Email", { type: "email", inputMode: "email" })}
          {text("contactPhone", "Phone", { placeholder: "+592 600 0000", inputMode: "tel" })}
          {text("whatsappNumber", "WhatsApp number", {
            hint: "Digits only, starting with the country code 592 — e.g. 5926001234. Powers every WhatsApp button.",
            inputMode: "numeric",
          })}
          {text("businessHours", "Opening hours", { placeholder: "Mon–Sat, 8:00 am – 6:00 pm" })}
          {text("address", "Address", { className: "md:col-span-2" })}
          {text("facebookUrl", "Facebook page", { placeholder: "https://facebook.com/…" })}
          {text("instagramUrl", "Instagram", { placeholder: "https://instagram.com/…" })}
          {text("tiktokUrl", "TikTok", { placeholder: "https://tiktok.com/@…" })}
        </div>
      </Panel>

      <Panel title="Announcement bar" description="A short message across the top of every page. Leave blank to hide it.">
        {text("announcement", "Message", { maxLength: 200, placeholder: "Free delivery on orders over G$20,000" })}
      </Panel>

      <Panel title="Orders and stock">
        <div className="grid gap-4 md:grid-cols-2">
          {text("orderPrefix", "Order number prefix", { hint: "Orders are numbered like JAG-100045.", maxLength: 8 })}
          {text("lowStockThreshold", "Low-stock warning at", {
            hint: "Products with this many or fewer left are flagged, and shoppers see “Only a few left”.",
            inputMode: "numeric",
          })}
          <Field
            label="Send new-order alerts to"
            htmlFor="settings-notificationEmails"
            hint="Up to 5 email addresses, separated by commas. Leave blank to use the contact email."
            error={fieldError("notificationEmails")}
            className="md:col-span-2"
          >
            <Input
              id="settings-notificationEmails"
              value={values.notificationEmails}
              onChange={(e) => set("notificationEmails", e.target.value)}
              placeholder="orders@yourstore.com, owner@gmail.com"
            />
          </Field>
          {text("freeDeliveryThreshold", "Free delivery on orders over (GYD)", {
            hint: (
              <>
                {values.freeDeliveryThreshold && Number(values.freeDeliveryThreshold.replace(/[^\d.]/g, "")) > 0
                  ? `Orders of ${formatPrice(Number(values.freeDeliveryThreshold.replace(/[^\d.]/g, "")))} or more ship free. `
                  : "Leave blank to always charge delivery. "}
                Set area fees in{" "}
                <Link href="/admin/delivery" className="font-semibold text-canopy hover:underline">
                  Delivery areas
                </Link>
                .
              </>
            ),
            inputMode: "numeric",
          })}
        </div>
      </Panel>

      <Panel title="Payment methods" description="What customers can choose at checkout. At least one must stay on.">
        <div className="space-y-6" id="settings-codEnabled">
          <FieldError>{fieldError("codEnabled")}</FieldError>
          <Toggle
            label="Cash on delivery"
            description="The customer pays the driver, or pays at pickup."
            checked={values.codEnabled}
            onChange={(v) => set("codEnabled", v)}
          />
          <div className="border-t border-line pt-5">
            <Toggle
              label="Bank transfer"
              description="Shown with these instructions at checkout, on the order page and in the receipt."
              checked={values.bankEnabled}
              onChange={(v) => set("bankEnabled", v)}
            />
            {values.bankEnabled && (
              <Field label="Bank transfer instructions" htmlFor="settings-bankInstructions" error={fieldError("bankInstructions")} className="mt-3">
                <Textarea
                  id="settings-bankInstructions"
                  rows={6}
                  value={values.bankInstructions}
                  onChange={(e) => set("bankInstructions", e.target.value)}
                  placeholder={"Bank: …\nAccount name: …\nAccount number: …"}
                />
              </Field>
            )}
          </div>
          <div className="border-t border-line pt-5">
            <Toggle
              label="MMG (Mobile Money Guyana)"
              description="Shown with these instructions at checkout, on the order page and in the receipt."
              checked={values.mmgEnabled}
              onChange={(v) => set("mmgEnabled", v)}
            />
            {values.mmgEnabled && (
              <Field label="MMG instructions" htmlFor="settings-mmgInstructions" error={fieldError("mmgInstructions")} className="mt-3">
                <Textarea
                  id="settings-mmgInstructions"
                  rows={4}
                  value={values.mmgInstructions}
                  onChange={(e) => set("mmgInstructions", e.target.value)}
                  placeholder="Send the total by MMG to …"
                />
              </Field>
            )}
          </div>
        </div>
      </Panel>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1280px] items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <span className="text-[13px] text-muted">{dirty ? "You have unsaved changes" : "All changes saved"}</span>
          <Button type="submit" disabled={pending || uploading || !dirty}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}
