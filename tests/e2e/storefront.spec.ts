import { expect, test, type Page } from "@playwright/test";

/** Opens the first product without size/colour choices from a listing. */
async function openSimpleProduct(page: Page, listing = "/c/kitchen") {
  await page.goto(listing);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const quickAdd = page.getByRole("button", { name: /^Add .* to cart$/ }).first();
  const card = quickAdd.locator("xpath=ancestor::article[1]");
  await card.getByRole("heading").getByRole("link").click();
  await expect(page.getByRole("button", { name: "Add to cart" }).first()).toBeVisible();
}

test.describe("storefront", () => {
  test("homepage shows banners, categories and deals", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Featured offers" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Shop by category" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's deals" })).toBeVisible();
    await expect(page.locator(".arrow-tag").first()).toBeVisible();
  });

  test("search tolerates typos and filters update the URL", async ({ page }) => {
    await page.goto("/search?q=iphnoe");
    await expect(page.getByText(/similar spellings/)).toBeVisible();
    await expect(page.locator("article").first()).toContainText(/iphone/i);

    await page.goto("/search?q=phone");
    // Scoped to <main>: streamed sections sit in a hidden copy outside it until React swaps them in.
    await expect(page.getByRole("main").getByText(/results for/)).toBeVisible();
    await page.getByRole("combobox", { name: /sort by/i }).selectOption("price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);
  });

  test("search suggestions appear while typing", async ({ page }) => {
    await page.goto("/");
    // Desktop and phones each get their own search box; only one is visible.
    const box = page.getByRole("combobox", { name: "Search products" });
    await box.fill("lapt");
    await expect(page.getByRole("listbox")).toContainText(/laptop/i);
  });

  test("category page filters by brand and shows chips", async ({ page }) => {
    await page.goto("/c/phones");
    await expect(page.getByRole("heading", { level: 1, name: "Phones" })).toBeVisible();
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 1024) {
      await page.getByRole("button", { name: /^Filters/ }).click();
    }
    await page.getByRole("checkbox", { name: /Apple/ }).first().check();
    await expect(page).toHaveURL(/brand=apple/);
    await expect(page.getByRole("button", { name: "Remove filter: Apple" })).toBeVisible();
  });

  test("guest checkout with cash on delivery", async ({ page }) => {
    await openSimpleProduct(page);
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    await expect(page.getByRole("dialog")).toContainText("Your cart (1)");
    await page.getByRole("dialog").getByRole("link", { name: "Checkout" }).click();

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await page.getByLabel("Full name").fill("Test Shopper");
    // A fresh number each run: checkout allows only a few pending orders per phone per hour.
    const phone = `+592 6${String(Date.now()).slice(-6)}`;
    await page.getByLabel("Phone / WhatsApp").fill(phone);
    await page.getByLabel("Email").fill("shopper@example.test");
    await page.locator("#checkout-zoneId").getByText("Georgetown", { exact: true }).click();
    await page.getByLabel("Street address").fill("1 Test Street");
    await page.locator("#checkout-paymentMethod").getByText("Cash on delivery", { exact: true }).click();
    await page.getByRole("button", { name: /Place order/ }).click();

    await expect(page.getByRole("heading", { name: /Thank you, Test!/ })).toBeVisible({ timeout: 20_000 });
    const orderNumber = (await page.locator("p.font-mono").first().innerText()).trim();
    expect(orderNumber).toMatch(/^[A-Z]+-\d+$/);

    // The guest can track it with the phone number used at checkout.
    await page.goto("/track-order");
    await page.getByLabel("Order number").fill(orderNumber);
    await page.getByLabel("Phone or email").fill(phone.slice(-7));
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByText(orderNumber)).toBeVisible();
    await expect(page.getByText("Order placed")).toBeVisible();
  });

  test("products with sizes ask for a choice before adding", async ({ page }) => {
    await page.goto("/c/women-dresses");
    await page.getByRole("link", { name: /^Choose options for/ }).first().click();
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    await expect(page.getByText(/Choose a size first/i)).toBeVisible();
  });

  test("policy pages fill in store details", async ({ page }) => {
    await page.goto("/pages/contact");
    await expect(page.getByRole("heading", { level: 1, name: "Contact us" })).toBeVisible();
    await expect(page.getByRole("main").locator(".prose-store")).not.toContainText("{{");
  });
});
