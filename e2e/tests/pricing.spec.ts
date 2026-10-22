import type { Route } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { registerViaApi, signInWithStorage, uniqueEmail } from "../support/api";
import { PricingPage } from "../pages/pricing-page";
import { RegisterPage } from "../pages/register-page";

// Stripe is never called. subscription.create is answered in the browser with a
// fake Checkout URL on a reserved .invalid domain, and that page is served locally.
const FAKE_CHECKOUT_URL = "https://checkout.e2e.invalid/pay/cs_test_fake";

interface Captured {
  calls: number;
  input: unknown;
}

async function mockCheckout(page: import("@playwright/test").Page): Promise<Captured> {
  const captured: Captured = { calls: 0, input: undefined };
  await page.route("**/trpc/subscription.create**", async (route: Route) => {
    captured.calls += 1;
    // httpBatchLink posts {"0": <input>} and expects an array back.
    captured.input = route.request().postDataJSON()["0"];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: { checkoutUrl: FAKE_CHECKOUT_URL } } }]),
    });
  });
  await page.route("https://checkout.e2e.invalid/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Fake Checkout</title><h1>Fake Checkout</h1>",
    }),
  );
  return captured;
}

for (const { plan, button } of [
  { plan: "pro", button: "upgradeToPro" },
  { plan: "enterprise", button: "goEnterprise" },
] as const) {
  test(`choosing ${plan} requests a ${plan} checkout and redirects to Checkout (mocked)`, async ({
    page,
    request,
  }) => {
    const auth = await registerViaApi(request, uniqueEmail(`checkout-${plan}`));
    await signInWithStorage(page, auth);
    const captured = await mockCheckout(page);

    const pricing = new PricingPage(page);
    await pricing.goto();
    await expect(pricing.heading).toBeVisible();
    await pricing[button].click();

    await expect(page).toHaveURL(FAKE_CHECKOUT_URL);
    await expect(page.getByRole("heading", { name: "Fake Checkout" })).toBeVisible();
    expect(captured.calls).toBe(1);
    expect(captured.input).toEqual({ plan });
  });
}

test("a signed-out visitor choosing a plan is sent to sign-up and no checkout is created", async ({
  page,
}) => {
  const captured = await mockCheckout(page);

  const pricing = new PricingPage(page);
  await pricing.goto();
  await pricing.upgradeToPro.click();

  await expect(page).toHaveURL(/\/register$/);
  await expect(new RegisterPage(page).heading).toBeVisible();
  expect(captured.calls).toBe(0);
});
