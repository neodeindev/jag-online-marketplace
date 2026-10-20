import type { Banner } from "@/lib/types";

export interface BannerRow {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  link_url: string | null;
  image_url: string;
  storage_path: string | null;
  placement: Banner["placement"];
  layout: Banner["layout"];
  theme: Banner["theme"];
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export const BANNER_COLUMNS =
  "id, title, subtitle, cta_label, link_url, image_url, storage_path, placement, layout, theme, sort_order, is_active, starts_at, ends_at, created_at";

export const BANNER_THEMES: { value: Banner["theme"]; label: string; swatch: string }[] = [
  { value: "forest", label: "Forest green", swatch: "#0c5a3f" },
  { value: "ink", label: "Rainforest ink", swatch: "#0e2a22" },
  { value: "gold", label: "Gold", swatch: "#ffc21a" },
  { value: "red", label: "Red", swatch: "#d62839" },
  { value: "mist", label: "Mist", swatch: "#e8f4ee" },
];

export type BannerState = "live" | "scheduled" | "ended" | "hidden";

export function bannerState(b: Pick<BannerRow, "is_active" | "starts_at" | "ends_at">, now: number): BannerState {
  if (!b.is_active) return "hidden";
  if (b.ends_at && new Date(b.ends_at).getTime() <= now) return "ended";
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return "scheduled";
  return "live";
}

/** Internal path ("/deals") or full http(s) URL. */
export function isValidBannerLink(value: string): boolean {
  if (!value) return true;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
