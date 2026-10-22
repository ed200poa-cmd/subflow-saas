import type { APIRequestContext, Page } from "@playwright/test";
import { BACKEND_URL } from "./env";

export interface AuthResult {
  token: string;
  user: { id: string; email: string; role: string };
}

// Each test gets its own account so tests can run in parallel across browsers.
export function uniqueEmail(tag: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e-${tag}-${Date.now()}-${rand}@subflow.test`;
}

export const TEST_PASSWORD = "e2e-dummy-password-123";

async function trpcMutation<T>(
  request: APIRequestContext,
  path: string,
  input: unknown,
): Promise<T> {
  const res = await request.post(`${BACKEND_URL}/trpc/${path}`, { data: input });
  if (!res.ok()) {
    throw new Error(`${path} failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).result.data as T;
}

export function registerViaApi(
  request: APIRequestContext,
  email: string,
  password = TEST_PASSWORD,
): Promise<AuthResult> {
  return trpcMutation(request, "auth.register", { email, password });
}

export function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<AuthResult> {
  return trpcMutation(request, "auth.login", { email, password });
}

// Puts a session in localStorage the same way the app's saveAuth() does, so a
// test can start already signed in without repeating the login UI.
export async function signInWithStorage(page: Page, auth: AuthResult): Promise<void> {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }, auth);
}
