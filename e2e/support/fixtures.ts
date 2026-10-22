import { test as base, expect } from "@playwright/test";

// Every test fails if the browser tries to reach Stripe. Requests are aborted
// before they leave the machine and recorded so the test can assert on them.
export const test = base.extend<{ stripeRequests: string[] }>({
  stripeRequests: [
    async ({ page }, use) => {
      const hits: string[] = [];
      await page.route(/^https?:\/\/([^/]*\.)?stripe\.com\//, (route) => {
        hits.push(route.request().url());
        return route.abort();
      });
      await use(hits);
      expect(hits, "browser must not contact Stripe").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
