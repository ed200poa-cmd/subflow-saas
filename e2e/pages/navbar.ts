import type { Locator, Page } from "@playwright/test";

export class Navbar {
  readonly root: Locator;
  readonly loginLink: Locator;
  readonly getStartedLink: Locator;
  readonly dashboardLink: Locator;
  readonly adminLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole("navigation");
    this.loginLink = this.root.getByRole("link", { name: "Login" });
    this.getStartedLink = this.root.getByRole("link", { name: "Get Started" });
    this.dashboardLink = this.root.getByRole("link", { name: "Dashboard" });
    this.adminLink = this.root.getByRole("link", { name: "Admin" });
    this.logoutButton = this.root.getByRole("button", { name: "Logout" });
  }

  userEmail(email: string): Locator {
    return this.root.getByText(email, { exact: true });
  }
}
