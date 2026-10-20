import { expect, test, type Page } from "@playwright/test";

// Demo accounts created by `npm run seed:demo` (see scripts/seed-demo.mjs).
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || "owner@jagmarket.test";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD || "JagDemo-2026!";

async function signIn(page: Page, email: string, password: string, next = "/admin") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith(next));
}

test.describe("dashboard", () => {
  test("signed-out visitors are sent to sign in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });

  test("customers can't open the dashboard", async ({ page }) => {
    await signIn(page, "ann@jagmarket.test", "JagDemo-2026!", "/account");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account/);
  });

  test("owner sees the overview and the order inbox", async ({ page }) => {
    await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
    await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
    await page.getByRole("link", { name: /^Orders/ }).first().click();
    await expect(page).toHaveURL(/\/admin\/orders/);
    await expect(page.getByRole("main")).toContainText(/JAG-\d+/);
  });

  test("owner can hide a product and it disappears from the store", async ({ page }) => {
    await signIn(page, OWNER_EMAIL, OWNER_PASSWORD, "/admin/products");
    await expect(page.getByRole("heading", { name: "Products", level: 1 })).toBeVisible();
    const firstRow = page.locator("tbody tr").first();
    await firstRow.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]+/);
    const editorUrl = page.url();
    const slug = await page.getByLabel("Web address").inputValue();
    expect(slug).not.toBe("");

    const visible = page.getByRole("switch", { name: /Show in store/ });
    const setVisible = async (on: boolean) => {
      await page.goto(editorUrl);
      // The switch's checkbox is visually hidden; click its label like a person would.
      if ((await visible.isChecked()) !== on) await page.getByText("Show in store", { exact: true }).click();
      await expect(visible).toBeChecked({ checked: on });
      await page.getByRole("button", { name: "Save product" }).click();
      await expect(page.getByText("Product saved")).toBeVisible();
    };

    await setVisible(false);
    try {
      await page.goto(`/p/${slug}`);
      await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
    } finally {
      await setVisible(true);
    }
    await page.goto(`/p/${slug}`);
    await expect(page.getByRole("button", { name: "Add to cart" }).first()).toBeVisible();
  });
});
