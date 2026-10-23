import { test, expect } from "../support/fixtures";
import { BACKEND_URL } from "../support/env";
import { TEST_PASSWORD, registerViaApi, uniqueEmail } from "../support/api";
import { DashboardPage } from "../pages/dashboard-page";
import { LoginPage } from "../pages/login-page";
import { Navbar } from "../pages/navbar";
import { RegisterPage } from "../pages/register-page";

const storedToken = (page: import("@playwright/test").Page) =>
  page.evaluate(() => localStorage.getItem("token"));

test("a new user can register and lands on a dashboard backed by real data", async ({ page }) => {
  const email = uniqueEmail("register");
  const register = new RegisterPage(page);
  await register.goto();
  await register.register(email, TEST_PASSWORD);

  const dashboard = new DashboardPage(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(dashboard.heading).toBeVisible();
  await expect(dashboard.welcome(email)).toBeVisible();
  // Status proves the data came from Postgres: it is "active" only when
  // subscription.status returns the row inserted at registration (a placeholder otherwise).
  // The plan label also falls back to "Free" without data, so it is a UI check only.
  await expect(dashboard.subscriptionStatus).toHaveText("active");
  await expect(dashboard.currentPlan).toHaveText("Free");

  const nav = new Navbar(page);
  await expect(nav.userEmail(email)).toBeVisible();
  await expect(nav.logoutButton).toBeVisible();
  expect(await storedToken(page)).toBeTruthy();
});

test("a registered user can log in and reach the dashboard", async ({ page, request }) => {
  const email = uniqueEmail("login");
  await registerViaApi(request, email);

  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, TEST_PASSWORD);

  const dashboard = new DashboardPage(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(dashboard.welcome(email)).toBeVisible();
  await expect(dashboard.subscriptionStatus).toHaveText("active");
});

test("login with a wrong password is rejected and no session is stored", async ({ page, request }) => {
  const email = uniqueEmail("badpw");
  await registerViaApi(request, email);

  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, "not-the-right-password");

  await expect(login.errorMessage("Invalid credentials")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(await storedToken(page)).toBeNull();
});

test("mismatched passwords block registration and no account is created", async ({ page, request }) => {
  const email = uniqueEmail("mismatch");
  const register = new RegisterPage(page);
  await register.goto();
  await register.register(email, TEST_PASSWORD, "a-different-password");

  await expect(register.errorMessage("Passwords do not match")).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);

  // The backend must not know this email: logging in with it fails.
  const res = await request.post(`${BACKEND_URL}/trpc/auth.login`, {
    data: { email, password: TEST_PASSWORD },
  });
  expect(res.status()).toBe(401);
});

test("logout ends the session and protected pages redirect to login", async ({ page, request }) => {
  const email = uniqueEmail("logout");
  await registerViaApi(request, email);

  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, TEST_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);

  const nav = new Navbar(page);
  await nav.logoutButton.click();

  await expect(page).toHaveURL(/\/$/);
  await expect(nav.loginLink).toBeVisible();
  await expect(nav.logoutButton).toHaveCount(0);
  expect(await storedToken(page)).toBeNull();

  await new DashboardPage(page).goto();
  await expect(page).toHaveURL(/\/login$/);
});
