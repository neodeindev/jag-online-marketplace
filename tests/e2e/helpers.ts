import { expect, type Page } from "@playwright/test";

// Demo accounts created by `npm run seed:demo` (see scripts/seed-demo.mjs).
export const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || "owner@jagmarket.test";
export const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD || "JagDemo-2026!";
export const DEMO_PASSWORD = "JagDemo-2026!";

/** A suffix that keeps names, SKUs and emails unique across runs. */
export const stamp = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

export async function signIn(page: Page, email: string, password: string, next = "/admin") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith(next));
}

/** A real PNG drawn in the browser, for photo uploads. */
export async function makePng(page: Page, colour = "#1f7a4d"): Promise<Buffer> {
  const dataUrl = await page.evaluate((fill) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 800);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(400, 400, 260, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL("image/png");
  }, colour);
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

/** Opens the first product without size/colour choices from a listing. */
export async function openSimpleProduct(page: Page, listing = "/c/kitchen") {
  await page.goto(listing);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const quickAdd = page.getByRole("button", { name: /^Add .* to cart$/ }).first();
  const card = quickAdd.locator("xpath=ancestor::article[1]");
  await card.getByRole("heading").getByRole("link").click();
  await expect(page.getByRole("button", { name: "Add to cart" }).first()).toBeVisible();
}

/**
 * Places a cash-on-delivery order for one simple product as a guest.
 * Uses a fresh phone number: checkout allows only a few pending orders per phone per hour.
 */
export async function placeGuestOrder(page: Page, name = "Test Shopper") {
  await openSimpleProduct(page);
  const productSlug = new URL(page.url()).pathname.replace("/p/", "");
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Your cart (1)");
  await page.getByRole("dialog").getByRole("link", { name: "Checkout" }).click();

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  const phone = `+592 6${String(Date.now()).slice(-6)}`;
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Phone / WhatsApp").fill(phone);
  await page.getByLabel("Email").fill("shopper@example.test");
  await page.locator("#checkout-zoneId").getByText("Georgetown", { exact: true }).click();
  await page.getByLabel("Street address").fill("1 Test Street");
  await page.locator("#checkout-paymentMethod").getByText("Cash on delivery", { exact: true }).click();
  await page.getByRole("button", { name: /Place order/ }).click();

  await expect(page.getByRole("heading", { name: new RegExp(`Thank you, ${name.split(" ")[0]}!`) })).toBeVisible({
    timeout: 20_000,
  });
  const orderNumber = (await page.locator("p.font-mono").first().innerText()).trim();
  expect(orderNumber).toMatch(/^[A-Z]+-\d+$/);
  return { orderNumber, phone, productSlug };
}

/** Creates a new customer account (email confirmation is off on the dev project) and stays signed in. */
export async function registerShopper(page: Page, name = "Jordan Test") {
  const email = `e2e-shopper-${stamp()}@jagmarket.test`;
  await page.goto("/register");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/account"));
  return { email, password: DEMO_PASSWORD };
}

/** Reads a product's stock straight from the database, as the public storefront can. */
export async function stockOf(slug: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase URL and publishable key must be set in .env for this test.");
  const res = await fetch(`${url}/rest/v1/products?select=stock&slug=eq.${encodeURIComponent(slug)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const rows = (await res.json()) as { stock: number }[];
  if (!rows[0]) throw new Error(`No product with slug ${slug}`);
  return rows[0].stock;
}
