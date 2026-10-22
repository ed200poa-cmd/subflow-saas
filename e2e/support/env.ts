// Shared by playwright.config.ts and the tests. Dummy values only.
export const FRONTEND_URL = "http://localhost:5173";
export const BACKEND_URL = "http://localhost:3000";

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@subflow.test",
  password: process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-dummy-password",
};
