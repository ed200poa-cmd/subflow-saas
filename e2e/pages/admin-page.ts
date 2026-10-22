import type { Locator, Page } from "@playwright/test";

export class AdminPage {
  readonly heading: Locator;
  readonly subscribersTable: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Admin Portal" });
    // The subscribers table is the one whose first column is "Email".
    this.subscribersTable = page
      .getByRole("table")
      .filter({ has: page.getByRole("columnheader", { name: "Email" }) });
  }

  async goto(): Promise<void> {
    await this.page.goto("/admin");
  }
}
