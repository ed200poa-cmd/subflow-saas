import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Welcome back" });
    this.email = page.getByLabel("Email");
    this.password = page.getByLabel("Password");
    this.submit = page.getByRole("button", { name: "Sign in" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  errorMessage(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
