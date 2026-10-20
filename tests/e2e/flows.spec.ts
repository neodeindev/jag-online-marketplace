import { expect, test, type Page } from "@playwright/test";
import {
  DEMO_PASSWORD,
  OWNER_EMAIL,
  OWNER_PASSWORD,
  makePng,
  placeGuestOrder,
  registerShopper,
  signIn,
  stamp,
  stockOf,
} from "./helpers";

/**
 * Full journeys through the dashboard and customer accounts. Each test cleans
 * up what it creates where the dashboard allows it (products, banners,
 * settings, staff access); orders, reviews and accounts stay as demo data.
 */

async function openProductInDashboard(page: Page, search: string) {
  await page.goto("/admin/products");
  await page.getByPlaceholder(/Search title or SKU/).fill(search);
  await page.getByPlaceholder(/Search title or SKU/).press("Enter");
  await page.locator("tbody tr").filter({ hasText: search }).first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}/);
}

async function deleteOpenProduct(page: Page) {
  await page.getByRole("button", { name: "Delete product" }).click();
  await page.getByRole("button", { name: "Click again to delete" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
}

test.describe("dashboard journeys", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
  });

  test("add a product with a photo, find it in the store, then delete it", async ({ page }) => {
    const title = `E2E Kettle ${stamp()}`;
    await page.goto("/admin/products/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("Boils a full kettle in minutes.\n\n- Auto shut-off\n- 1.7 litres");
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "kettle.png",
      mimeType: "image/png",
      buffer: await makePng(page),
    });
    await expect(page.getByText("Main photo")).toBeVisible({ timeout: 20_000 });
    await page.getByLabel("Price (G$)", { exact: true }).fill("9800");
    await page.getByLabel("Sale price (G$)").fill("8800");
    await page.getByLabel("In stock").fill("5");
    await page.getByLabel("Category").selectOption({ label: "Home & kitchen › Kitchen" });
    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}/, { timeout: 20_000 });
    const editorUrl = page.url();
    const slug = await page.getByLabel("Web address").inputValue();

    await page.goto(`/p/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("main").getByText("G$8,800").first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Auto shut-off")).toBeVisible();
    const photo = page.getByRole("main").locator(`img[alt="${title}"]`).first();
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    await page.goto(`/search?q=${encodeURIComponent(title)}`);
    await expect(page.getByRole("main").getByRole("link", { name: title }).first()).toBeVisible();

    await page.goto(editorUrl);
    await deleteOpenProduct(page);
    await page.goto(`/p/${slug}`);
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  });

  test("import products from CSV, then update them by SKU", async ({ page }) => {
    const sku = `E2E-${stamp()}`.toUpperCase();
    const title = `E2E Table Lamp ${sku}`;
    const upload = async (price: number) => {
      const csv = [
        "sku,title,price,stock,category,attributes,specifications",
        `${sku},${title},${price},7,Home & kitchen > Home decor,Colour: Black|White,Bulb: E27; Height: 45 cm`,
      ].join("\r\n");
      await page.goto("/admin/products/import");
      await page.locator('input[type="file"]').setInputFiles({ name: "products.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    };

    await upload(4500);
    await expect(page.locator("tbody")).toContainText("New");
    await page.getByRole("button", { name: "Import 1 row" }).click();
    await expect(page.getByText("Import finished")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("1 created")).toBeVisible();

    await page.goto(`/search?q=${encodeURIComponent(sku)}`);
    await page.getByRole("main").getByRole("link", { name: title }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("main").getByText("G$4,500").first()).toBeVisible();
    await expect(page.getByRole("main").getByText("45 cm")).toBeVisible();

    await upload(3900);
    await expect(page.locator("tbody")).toContainText("Update");
    await page.getByRole("button", { name: "Import 1 row" }).click();
    await expect(page.getByText("Import finished")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("1 updated")).toBeVisible();
    await openProductInDashboard(page, sku);
    await expect(page.getByLabel("Price (G$)", { exact: true })).toHaveValue("3900");

    await deleteOpenProduct(page);
  });

  test("move an order through confirmed and paid, then cancel it and restock", async ({ page, browser }) => {
    // Place the order as a guest in a separate, signed-out browser.
    const guest = await browser.newPage();
    const { orderNumber, phone, productSlug } = await placeGuestOrder(guest);
    const stockAfterOrder = await stockOf(productSlug);

    await page.goto("/admin/orders?status=pending");
    await page.getByRole("link", { name: orderNumber }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(orderNumber);
    // The first history entry shows the status once, not a repeated "Order placed" note.
    await expect(page.locator("li").filter({ hasText: /^Order placed/ }).getByText("Order placed", { exact: true })).toHaveCount(1);

    const status = page.getByLabel("Status", { exact: true });
    await status.selectOption({ label: "Confirmed" });
    await page.getByLabel("Note", { exact: true }).fill("Called the customer to confirm.");
    await page.getByRole("button", { name: "Mark as confirmed" }).click();
    await expect(page.getByText("Called the customer to confirm.")).toBeVisible();

    await page.getByRole("group", { name: "Payment status" }).getByRole("button", { name: "Paid", exact: true }).click();
    await expect(page.getByRole("group", { name: "Payment status" }).getByRole("button", { name: "Paid", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await guest.goto("/track-order");
    await guest.getByLabel("Order number").fill(orderNumber);
    await guest.getByLabel("Phone or email").fill(phone.slice(-7));
    await guest.getByRole("button", { name: "Track order" }).click();
    await expect(guest.getByRole("main").getByText("Confirmed").first()).toBeVisible();

    await status.selectOption({ label: "Cancelled" });
    await page.getByRole("button", { name: "Cancel order" }).click();
    await expect(page.getByText(/This order was cancelled/)).toBeVisible();
    expect(await stockOf(productSlug)).toBe(stockAfterOrder + 1);
    await guest.close();
  });

  test("create a homepage banner with an image, then delete it", async ({ page }) => {
    const headline = `E2E sale ${stamp()}`;
    await page.goto("/admin/banners/new");
    await page.getByLabel("Headline").fill(headline);
    await page.getByLabel("Subtitle").fill("Everything must go.");
    await page.getByLabel("Link").fill("/deals");
    await page.locator('input[type="file"]').setInputFiles({ name: "banner.png", mimeType: "image/png", buffer: await makePng(page, "#d4202c") });
    await expect(page.getByRole("button", { name: "Create banner" })).toBeEnabled({ timeout: 20_000 });
    await page.getByRole("button", { name: "Create banner" }).click();
    await page.waitForURL((url) => url.pathname === "/admin/banners", { timeout: 20_000 });

    await page.goto("/");
    await expect(page.getByRole("region", { name: "Featured offers" }).getByText(headline)).toBeAttached();

    await page.goto("/admin/banners");
    // Scope to this banner's own row so no other banner can be opened by mistake.
    const row = page.getByRole("listitem").filter({ hasText: headline });
    await expect(row).toHaveCount(1);
    await row.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByLabel("Headline")).toHaveValue(headline);
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Click again to delete" }).click();
    await expect(page).toHaveURL(/\/admin\/banners$/);
    // Role queries skip the editor Next.js keeps mounted (hidden) for back navigation.
    await expect(page.getByRole("listitem").filter({ hasText: headline })).toHaveCount(0);
  });

  test("publish a policy page, view it in the store, then delete it", async ({ page }) => {
    const title = `E2E Warranty ${stamp()}`;
    await page.goto("/admin/pages/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Page content").fill("## Warranty\n\nEvery item is covered by {{store_name}} for 30 days.");
    await page.getByRole("button", { name: "Create page" }).click();
    await expect(page).toHaveURL(/\/admin\/pages\/[0-9a-f-]{36}/, { timeout: 20_000 });
    const slug = await page.getByLabel("Web address").inputValue();

    await page.goto(`/pages/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    // {{store_name}} is replaced with the name from Settings.
    await expect(page.getByRole("main").getByText(/covered by JAG Marketplace for 30 days/)).toBeVisible();

    await page.goto("/admin/pages");
    await page.getByRole("row").filter({ hasText: title }).getByRole("link", { name: title }).click();
    await page.getByRole("button", { name: "Delete page" }).click();
    await page.getByRole("button", { name: "Click again to delete" }).click();
    await page.waitForURL((url) => url.pathname === "/admin/pages");
    await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);
  });

  test("change the announcement bar in settings, then restore it", async ({ page }) => {
    const message = `E2E announcement ${stamp()}`;
    await page.goto("/admin/settings");
    const field = page.getByLabel("Message");
    const original = await field.inputValue();
    await field.fill(message);
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("All changes saved")).toBeVisible();

    try {
      await page.goto("/");
      await expect(page.getByText(message)).toBeVisible();
    } finally {
      await page.goto("/admin/settings");
      await page.getByLabel("Message").fill(original);
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByText("All changes saved")).toBeVisible();
    }
  });

  test("add a staff member who can only manage orders, then remove their access", async ({ page, browser }) => {
    const email = `e2e-staff-${stamp()}@jagmarket.test`;
    await page.goto("/admin/staff");
    await page.getByRole("button", { name: "Add staff member" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Full name").fill("Robin Test");
    await sheet.getByLabel("Email").fill(email);
    const password = await sheet.getByLabel("Temporary password").inputValue();
    expect(password.length).toBeGreaterThanOrEqual(8);
    for (const section of ["Orders", "Products & catalog", "Storefront content", "Customers"]) {
      await sheet.getByRole("checkbox", { name: new RegExp(`^${section}`) }).setChecked(section === "Orders");
    }
    await sheet.getByRole("button", { name: "Add staff member" }).click();
    await expect(sheet.getByText(password)).toBeVisible({ timeout: 20_000 });

    const staff = await browser.newPage();
    await signIn(staff, email, password);
    const nav = staff.getByRole("navigation", { name: "Dashboard" });
    await expect(nav.getByRole("link", { name: /^Orders/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Products" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await staff.close();

    await page.goto("/admin/staff");
    const row = page.getByRole("row").filter({ hasText: email });
    await row.getByRole("button", { name: "Remove access" }).click();
    await row.getByRole("button", { name: "Click again to remove" }).click();
    await expect(page.getByRole("row").filter({ hasText: email })).toHaveCount(0);

    const removed = await browser.newPage();
    await signIn(removed, email, password, "/account");
    await removed.goto("/admin");
    await expect(removed).toHaveURL(/\/account/);
    await removed.close();
  });
});

test.describe("customer accounts", () => {
  test("register, save to wishlist, and review a product once it's published", async ({ page, browser }) => {
    const email = `e2e-shopper-${stamp()}@jagmarket.test`;
    await page.goto("/register");
    await page.getByLabel("Your name").fill("Jordan Test");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/account"));

    await page.goto("/c/kitchen");
    const card = page.locator("main article").first();
    const productTitle = (await card.getByRole("heading").innerText()).trim();
    await card.getByRole("heading").getByRole("link").click();
    await page.getByRole("button", { name: "Save for later" }).click();
    await expect(page.getByText("Saved to your wishlist")).toBeVisible();
    const productUrl = page.url();

    await page.goto("/account/wishlist");
    await expect(page.getByRole("main").getByText(productTitle)).toBeVisible();

    const reviewText = `Sturdy and well made ${stamp()}.`;
    await page.goto(productUrl);
    await page.getByRole("button", { name: "Write a review" }).click();
    await page.getByRole("button", { name: "4 stars" }).click();
    await page.getByLabel("Your review").fill(reviewText);
    await page.getByRole("button", { name: "Submit review" }).click();
    await expect(page.getByRole("main").getByText(/review/i).filter({ hasText: /thank|publish|check/i }).first()).toBeVisible();

    const owner = await browser.newPage();
    await signIn(owner, OWNER_EMAIL, OWNER_PASSWORD, "/admin/reviews");
    const pending = owner.getByRole("listitem").filter({ hasText: reviewText });
    await expect(pending).toHaveCount(1);
    await pending.getByRole("button", { name: "Publish" }).click();
    await expect(owner.getByText(reviewText)).toHaveCount(0);
    await owner.close();

    await page.goto(productUrl);
    await expect(page.getByText(reviewText)).toBeVisible();

    // Hide it again so test reviews don't pile up on the demo store.
    const moderator = await browser.newPage();
    await signIn(moderator, OWNER_EMAIL, OWNER_PASSWORD, "/admin/reviews");
    await moderator.goto("/admin/reviews?status=published");
    const published = moderator.getByRole("listitem").filter({ hasText: reviewText });
    await published.getByRole("button", { name: "Hide" }).click();
    await expect(moderator.getByRole("listitem").filter({ hasText: reviewText })).toHaveCount(0);
    await moderator.close();
  });
});

test.describe("signed-in shopping", () => {
  test("buy a dress in a chosen size and colour with saved details, then find it in my orders", async ({ page }) => {
    await registerShopper(page, "Priya Test");
    const phone = `+592 6${String(Date.now()).slice(-6)}`;
    await page.goto("/account/profile");
    await page.getByLabel("Phone / WhatsApp").fill(phone);
    await page.getByLabel("Street address").fill("14 Brickdam");
    await page.getByLabel("Village / town").fill("Georgetown");
    await page.getByLabel("Delivery area").selectOption({ label: "Georgetown" });
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByRole("main").getByText(/saved/i).first()).toBeVisible();

    await page.goto("/c/women-dresses");
    await page.getByRole("link", { name: /^Choose options for/ }).first().click();
    await page.getByRole("group", { name: /^Size/ }).getByRole("button", { name: "M", exact: true }).click();
    const colour = page.getByRole("group", { name: /^Colour/ }).getByRole("button").first();
    const colourName = (await colour.getAttribute("aria-label")) ?? (await colour.innerText());
    await colour.click();
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toContainText("Size: M");
    await drawer.getByRole("link", { name: "Checkout" }).click();

    // Details come from the profile.
    await expect(page.getByLabel("Full name")).toHaveValue("Priya Test");
    await expect(page.getByLabel("Phone / WhatsApp")).toHaveValue(phone);
    await expect(page.getByLabel("Street address")).toHaveValue("14 Brickdam");
    await page.locator("#checkout-paymentMethod").getByText("Cash on delivery", { exact: true }).click();
    await page.getByRole("button", { name: /Place order/ }).click();

    await expect(page.getByRole("heading", { name: /Thank you, Priya!/ })).toBeVisible({ timeout: 20_000 });
    const orderNumber = (await page.locator("p.font-mono").first().innerText()).trim();
    await expect(page.getByRole("main").getByText(`Size: M · Colour: ${colourName}`)).toBeVisible();

    await page.goto("/account");
    await page.getByRole("link", { name: new RegExp(orderNumber) }).click();
    await expect(page.getByRole("main").getByText(orderNumber).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Order placed").first()).toBeVisible();
  });

  test("change my password and sign in with the new one", async ({ page }) => {
    const { email } = await registerShopper(page);
    const newPassword = `New-${stamp()}-pass`;
    await page.goto("/account/profile");
    await page.getByLabel("New password").fill(newPassword);
    await page.getByLabel("Type it again").fill(newPassword);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("main").getByText(/password (was )?(changed|updated)/i)).toBeVisible();

    await page.getByRole("navigation", { name: "Account" }).getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await signIn(page, email, newPassword, "/account");
    await expect(page.getByRole("heading", { name: "Hello, Jordan" })).toBeVisible();
  });
});

test.describe("dashboard housekeeping", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
  });

  test("categories start collapsed, open on demand, and stay as I left them", async ({ page }) => {
    const row = (slug: string) => page.getByRole("listitem").filter({ hasText: `/c/${slug} ` });
    const electronics = page.getByRole("button", { name: "Sub-categories of Electronics" });
    await page.goto("/admin/categories");
    await expect(row("electronics")).toContainText("4 sub-categories");
    await expect(row("phones")).toHaveCount(0);

    await electronics.click();
    await expect(electronics).toHaveAttribute("aria-expanded", "true");
    await expect(row("phones")).toHaveCount(1);
    await expect(row("women")).toHaveCount(0);

    await page.reload();
    await expect(row("phones")).toHaveCount(1);

    await page.getByRole("button", { name: "Expand all" }).click();
    await expect(row("women-dresses")).toHaveCount(1);
    await page.getByRole("button", { name: "Collapse all" }).click();
    await expect(row("phones")).toHaveCount(0);
    await expect(row("women-dresses")).toHaveCount(0);
  });

  test("add a sub-category, see it in the store, then delete it", async ({ page }) => {
    const name = `E2E Candles ${stamp()}`;
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "Add a sub-category to Home & kitchen" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Name").fill(name);
    await sheet.getByRole("button", { name: "Save category" }).click();
    const row = page.getByRole("listitem").filter({ hasText: name });
    await expect(row).toHaveCount(1);
    const slug = (await row.innerText()).match(/\/c\/([a-z0-9-]+)/)?.[1];
    expect(slug).toBeTruthy();

    await page.goto(`/c/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Home & kitchen");

    await page.goto("/admin/categories");
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await page.getByRole("button", { name: "Click again to delete" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
  });

  test("change a delivery fee and see it at checkout, then restore it", async ({ page }) => {
    const row = () => page.getByRole("row").filter({ hasText: "Linden" });
    await page.goto("/admin/delivery");
    await row().getByRole("button", { name: "Edit" }).click();
    const fee = page.getByRole("dialog").getByLabel("Delivery fee (GYD)");
    const original = await fee.inputValue();
    await fee.fill("3250");
    await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
    await expect(row()).toContainText("G$3,250");

    try {
      await page.goto("/c/kitchen");
      await page.getByRole("button", { name: /^Add .* to cart$/ }).first().click();
      await page.getByRole("dialog").getByRole("link", { name: "Checkout" }).click();
      const linden = page.locator("#checkout-zoneId label").filter({ hasText: "Linden" });
      await expect(linden).toContainText("G$3,250");
    } finally {
      await page.goto("/admin/delivery");
      await row().getByRole("button", { name: "Edit" }).click();
      await page.getByRole("dialog").getByLabel("Delivery fee (GYD)").fill(original);
      await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
      await expect(row()).not.toContainText("G$3,250");
    }
  });

  test("export the catalog as a CSV file", async ({ page }) => {
    const res = await page.request.get("/admin/products/export");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toMatch(/attachment; filename="products-.*\.csv"/);
    const lines = (await res.text()).trim().split(/\r?\n/);
    expect(lines[0].replace(/^﻿/, "")).toBe(
      "sku,title,description,price,sale_price,stock,brand,category,status,featured,attributes,specifications,images",
    );
    expect(lines.length).toBeGreaterThan(150);
  });

  test("open a printable packing slip for an order", async ({ page }) => {
    await page.goto("/admin/orders");
    const firstOrder = page.getByRole("main").getByRole("link", { name: /^[A-Z]+-\d+$/ }).first();
    const orderNumber = (await firstOrder.innerText()).trim();
    await firstOrder.click();
    // The slip opens in a new tab and brings up the print dialog by itself.
    const [slip] = await Promise.all([page.waitForEvent("popup"), page.getByRole("link", { name: "Packing slip" }).click()]);
    await expect(slip.getByText("Packing slip", { exact: true })).toBeVisible();
    await expect(slip.getByText(orderNumber).first()).toBeVisible();
    await expect(slip.getByRole("button", { name: "Print" })).toBeVisible();
    await slip.close();
  });
});
