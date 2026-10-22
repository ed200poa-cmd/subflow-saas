import { test, expect } from "../support/fixtures";
import { LoginPage } from "../pages/login-page";
import { RegisterPage } from "../pages/register-page";

test("landing page loads and its calls to action open sign-up and sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SubFlow/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Subscription management");

  await page.getByRole("button", { name: "Start for free" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(new RegisterPage(page).heading).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(new LoginPage(page).heading).toBeVisible();
});
