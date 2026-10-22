import type { Locator, Page } from "@playwright/test";

export class DashboardPage {
  readonly heading: Locator;
  readonly currentPlan: Locator;
  readonly subscriptionStatus: Locator;
  readonly upgradeButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Dashboard", level: 1 });
    this.currentPlan = page.getByTestId("current-plan");
    this.subscriptionStatus = page.getByTestId("subscription-status");
    this.upgradeButton = page.getByRole("button", { name: "Upgrade to Pro" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
  }

  welcome(email: string): Locator {
    return this.page.getByText(`Welcome back, ${email}`);
  }
}
