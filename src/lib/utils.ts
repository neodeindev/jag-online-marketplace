import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL-safe slug: "Women's Dresses & Skirts" -> "womens-dresses-skirts". Mirrors public.slugify(). */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/'/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

/** Reads a single value from a Next.js searchParams entry. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads a list from repeated or comma-separated searchParams entries. */
export function listParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Image URLs that Next.js can optimise (our Supabase storage). Others are shown as-is. */
export function isOptimizableImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(supabase && url.startsWith(`${supabase.replace(/\/$/, "")}/storage/v1/object/public/`));
}
