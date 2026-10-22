import { defineConfig, devices } from "@playwright/test";
import { ADMIN, BACKEND_URL, FRONTEND_URL } from "./support/env";

const isCI = !!process.env.CI;

// Dummy values only. Real secrets never belong here or in CI.
// The Stripe values are not valid keys, so the backend cannot reach a real
// Stripe account; the browser-side subscription calls are mocked in tests.
const backendEnv = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://subflow:subflow_dev@localhost:5432/subflow",
  JWT_SECRET: "e2e-dummy-jwt-secret",
  STRIPE_SECRET_KEY: "stripe-disabled-in-e2e",
  STRIPE_WEBHOOK_SECRET: "stripe-disabled-in-e2e",
  STRIPE_PRO_PRICE_ID: "price-e2e-pro",
  STRIPE_ENTERPRISE_PRICE_ID: "price-e2e-enterprise",
  PORT: "3000",
  FRONTEND_URL,
  E2E_ADMIN_EMAIL: ADMIN.email,
  E2E_ADMIN_PASSWORD: ADMIN.password,
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  // No retries: a flaky test should show up as a failure, not be hidden.
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: FRONTEND_URL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      // Push the Drizzle schema, seed the admin account, then start the API.
      command:
        "npx drizzle-kit push && npx tsx scripts/seed-e2e-admin.ts && npx tsx src/index.ts",
      cwd: "../backend",
      url: `${BACKEND_URL}/health`,
      env: backendEnv,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: "npx vite --port 5173 --strictPort",
      cwd: "../frontend",
      url: FRONTEND_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
