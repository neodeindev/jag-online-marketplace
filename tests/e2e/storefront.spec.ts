import { expect, test } from "@playwright/test";
import { placeGuestOrder } from "./helpers";

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
    await expect(page.getByRole("main").getByText(/similar spellings/)).toBeVisible();
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
    const { orderNumber, phone } = await placeGuestOrder(page);

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
