import { test, expect } from "../support/fixtures";
import { ADMIN } from "../support/env";
import { TEST_PASSWORD, registerViaApi, signInWithStorage, uniqueEmail } from "../support/api";
import { injectFault } from "../support/faults";
import { AdminPage } from "../pages/admin-page";
import { DashboardPage } from "../pages/dashboard-page";
import { LoginPage } from "../pages/login-page";
import { PricingPage } from "../pages/pricing-page";

const FAKE_CHECKOUT_URL = "https://checkout.e2e.invalid/pay/cs_test_slow";

const storedToken = (page: import("@playwright/test").Page) =>
  page.evaluate(() => localStorage.getItem("token"));

test.describe("login when the API misbehaves", () => {
  test("slow login shows a pending state, then signs in", async ({ page, request }) => {
    const email = uniqueEmail("slow-login");
    await registerViaApi(request, email);
    await injectFault(page, "auth.login", { kind: "slow", ms: 2_000 });

    const login = new LoginPage(page);
    await login.goto();
    await login.login(email, TEST_PASSWORD);

    const pending = page.getByRole("button", { name: "Signing in..." });
    await expect(pending).toBeVisible();
    await expect(pending).toBeDisabled();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });
    await expect(new DashboardPage(page).welcome(email)).toBeVisible();
  });

  test("a 500 from login shows the error and keeps the user signed out", async ({ page, request }) => {
    const email = uniqueEmail("500-login");
    await registerViaApi(request, email);
    await injectFault(page, "auth.login", { kind: "error500" });

    const login = new LoginPage(page);
    await login.goto();
    await login.login(email, TEST_PASSWORD);

    await expect(page.getByRole("alert")).toHaveText("Internal server error");
    await expect(page).toHaveURL(/\/login$/);
    await expect(login.submit).toBeEnabled();
    expect(await storedToken(page)).toBeNull();
  });

  test("malformed JSON from login shows an error and keeps the user signed out", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("badjson-login");
    await registerViaApi(request, email);
    await injectFault(page, "auth.login", { kind: "malformedJson" });

    const login = new LoginPage(page);
    await login.goto();
    await login.login(email, TEST_PASSWORD);

    // The wording is the browser's JSON parser message, which differs per engine,
    // so only its presence is asserted.
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).not.toBeEmpty();
    await expect(page).toHaveURL(/\/login$/);
    expect(await storedToken(page)).toBeNull();
  });
});

test.describe("slow data loads", () => {
  test("dashboard shows Loading while data is slow, then the subscription from the database", async ({ page, request }) => {
    const auth = await registerViaApi(request, uniqueEmail("slow-dash"));
    await signInWithStorage(page, auth);
    await injectFault(page, "subscription.status", { kind: "slow", ms: 2_000 });

    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(page.getByText("Loading...", { exact: true })).toBeVisible();
    await expect(dashboard.subscriptionStatus).toHaveText("active", { timeout: 10_000 });
    await expect(dashboard.currentPlan).toHaveText("Free");
  });

  test("pricing disables plan buttons while checkout is being created", async ({ page, request }) => {
    const auth = await registerViaApi(request, uniqueEmail("slow-checkout"));
    await signInWithStorage(page, auth);
    await page.route("**/trpc/subscription.create**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ result: { data: { checkoutUrl: FAKE_CHECKOUT_URL } } }]),
      });
    });
    await page.route("https://checkout.e2e.invalid/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Fake Checkout</h1>" }),
    );

    const pricing = new PricingPage(page);
    await pricing.goto();
    await pricing.upgradeToPro.click();

    await expect(pricing.upgradeToPro).toBeDisabled();
    await expect(pricing.goEnterprise).toBeDisabled();
    await expect(page).toHaveURL(FAKE_CHECKOUT_URL, { timeout: 10_000 });
  });

  test("admin portal shows Loading while data is slow, then the portal", async ({ page }) => {
    await injectFault(page, "admin.getStats", { kind: "slow", ms: 2_000 });

    const login = new LoginPage(page);
    await login.goto();
    await login.login(ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/\/dashboard$/);

    const admin = new AdminPage(page);
    await admin.goto();
    await expect(page.getByText("Loading admin data...", { exact: true })).toBeVisible();
    await expect(admin.heading).toBeVisible({ timeout: 10_000 });
  });
});

// Known gaps, found in step 4 and reported instead of fixed. Each test states
// the behaviour the app should have; test.fixme keeps it out of the pass count
// until the app handles the failure.
test.describe("failed data loads (known gaps)", () => {
  test.fixme("dashboard tells the user when its data fails to load", async ({ page, request }) => {
    // Today: after the query retry the page renders plan "Free", status "—"
    // and 0 / 100 usage, with no error shown.
    const auth = await registerViaApi(request, uniqueEmail("500-dash"));
    await signInWithStorage(page, auth);
    await injectFault(page, "subscription.status", { kind: "error500" });
    await new DashboardPage(page).goto();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });

  test.fixme("pricing tells the user when checkout cannot be created", async ({ page, request }) => {
    // Today: nothing happens. The button re-enables and no message appears.
    const auth = await registerViaApi(request, uniqueEmail("500-checkout"));
    await signInWithStorage(page, auth);
    await injectFault(page, "subscription.create", { kind: "error500" });
    const pricing = new PricingPage(page);
    await pricing.goto();
    await pricing.upgradeToPro.click();
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test.fixme("admin portal tells the admin when its data fails to load", async ({ page }) => {
    // Today: the portal renders 0 users, $0.00 revenue and "No users yet".
    await injectFault(page, "admin.getStats", { kind: "error500" });
    const login = new LoginPage(page);
    await login.goto();
    await login.login(ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await new AdminPage(page).goto();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });
});
