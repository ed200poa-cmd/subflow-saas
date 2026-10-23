import { test, expect } from "../support/fixtures";
import { ADMIN, BACKEND_URL } from "../support/env";
import { registerViaApi, signInWithStorage, uniqueEmail } from "../support/api";
import { AdminPage } from "../pages/admin-page";
import { LoginPage } from "../pages/login-page";
import { Navbar } from "../pages/navbar";

test("the seeded admin logs in and sees the admin portal with real users", async ({ page, request }) => {
  const otherEmail = uniqueEmail("listed");
  await registerViaApi(request, otherEmail);

  const login = new LoginPage(page);
  await login.goto();
  await login.login(ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/dashboard$/);

  const nav = new Navbar(page);
  await nav.adminLink.click();

  const admin = new AdminPage(page);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(admin.heading).toBeVisible();
  // The table is filled from admin.getUsers, which returns the newest 100 users,
  // so the account created just above must be listed. (The seeded admin is not
  // asserted: on a reused local database it can be older than the newest 100.)
  await expect(admin.subscribersTable.getByRole("cell", { name: otherEmail, exact: true })).toBeVisible();

  // Stats default to 0 without data; at least the admin and the user above exist.
  const totalUsers = Number(await admin.stat("Total Users").innerText());
  expect(totalUsers).toBeGreaterThanOrEqual(2);
});

test("a regular user is kept out of /admin in the UI and by the API", async ({ page, request }) => {
  const auth = await registerViaApi(request, uniqueEmail("regular"));
  await signInWithStorage(page, auth);

  await new AdminPage(page).goto();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(new Navbar(page).adminLink).toHaveCount(0);

  // The client-side redirect is not the real protection; every admin procedure
  // must refuse a regular user (403) and an anonymous caller (401).
  for (const procedure of ["getStats", "getUsers", "getRevenue", "getUsageStats"]) {
    const url = `${BACKEND_URL}/trpc/admin.${procedure}`;
    const asUser = await request.get(url, { headers: { Authorization: `Bearer ${auth.token}` } });
    expect(asUser.status(), `admin.${procedure} as a regular user`).toBe(403);
    const anonymous = await request.get(url);
    expect(anonymous.status(), `admin.${procedure} without a token`).toBe(401);
  }
});
