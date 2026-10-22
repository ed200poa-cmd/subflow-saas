import type { Locator, Page } from "@playwright/test";

export class PricingPage {
  readonly heading: Locator;
  readonly upgradeToPro: Locator;
  readonly goEnterprise: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Choose your plan" });
    this.upgradeToPro = page.getByRole("button", { name: "Upgrade to Pro" });
    this.goEnterprise = page.getByRole("button", { name: "Go Enterprise" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/pricing");
  }
}
