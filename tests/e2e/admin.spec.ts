import { expect, test } from "@playwright/test";
import { DEMO_PASSWORD, OWNER_EMAIL, OWNER_PASSWORD, signIn } from "./helpers";

test.describe("dashboard", () => {
  test("signed-out visitors are sent to sign in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });

  test("customers can't open the dashboard", async ({ page }) => {
    await signIn(page, "ann@jagmarket.test", DEMO_PASSWORD, "/account");
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
