import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { ADMIN } from "../support/env";
import { loginViaApi, registerViaApi, signInWithStorage, uniqueEmail } from "../support/api";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// Violations measured on 2026-10-23 and left for the owner to decide on (step 5).
// Each entry is rule id -> number of affected elements. The test fails on any new
// rule or on more affected elements, so accessibility can only stay or improve.
// When a violation is fixed, lower or delete its entry here.
const BASELINE: Record<string, Record<string, number>> = {
  landing: { "color-contrast": 4 },
  login: {},
  register: { "link-in-text-block": 1 },
  pricing: { "color-contrast": 3 },
  dashboard: { "color-contrast": 1 },
  admin: { "color-contrast": 1 },
};

async function expectNoNewViolations(page: Page, screen: string, testInfo: TestInfo) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await testInfo.attach(`axe-${screen}.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  const found = Object.fromEntries(results.violations.map((v) => [v.id, v.nodes.length]));
  const allowed = BASELINE[screen] ?? {};
  for (const [rule, count] of Object.entries(found)) {
    expect(allowed[rule], `${screen}: new axe violation "${rule}"`).toBeDefined();
    expect(count, `${screen}: "${rule}" affects more elements`).toBeLessThanOrEqual(allowed[rule]!);
  }
}

test("public screens have no new WCAG 2.1 AA violations", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoNewViolations(page, "landing", testInfo);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expectNoNewViolations(page, "login", testInfo);

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expectNoNewViolations(page, "register", testInfo);

  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Choose your plan" })).toBeVisible();
  await expectNoNewViolations(page, "pricing", testInfo);
});

test("dashboard has no new WCAG 2.1 AA violations", async ({ page, request }, testInfo) => {
  await signInWithStorage(page, await registerViaApi(request, uniqueEmail("a11y")));
  await page.goto("/dashboard");
  await expect(page.getByTestId("subscription-status")).toHaveText("active");
  await expectNoNewViolations(page, "dashboard", testInfo);
});

test("admin portal has no new WCAG 2.1 AA violations", async ({ page, request }, testInfo) => {
  await signInWithStorage(page, await loginViaApi(request, ADMIN.email, ADMIN.password));
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin Portal" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
  await expectNoNewViolations(page, "admin", testInfo);
});
