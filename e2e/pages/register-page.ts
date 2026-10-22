import type { Locator, Page } from "@playwright/test";

export class RegisterPage {
  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly confirm: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Create account" });
    this.email = page.getByLabel("Email");
    this.password = page.getByLabel("Password", { exact: true });
    this.confirm = page.getByLabel("Confirm Password");
    this.submit = page.getByRole("button", { name: "Create account" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/register");
  }

  async register(email: string, password: string, confirm = password): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.confirm.fill(confirm);
    await this.submit.click();
  }

  errorMessage(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
