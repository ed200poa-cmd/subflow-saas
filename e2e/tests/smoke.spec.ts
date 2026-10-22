import { test, expect } from "@playwright/test";
import { BACKEND_URL } from "../support/env";

// Confirms the config boots both real servers before any flow tests run.
test("backend health endpoint responds", async ({ request }) => {
  const res = await request.get(`${BACKEND_URL}/health`);
  expect(res.ok()).toBe(true);
  expect((await res.json()).status).toBe("ok");
});
