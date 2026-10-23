import type { Page, Route } from "@playwright/test";

// Fault injection for tRPC calls made by the browser. httpBatchLink can put
// several procedures in one request ("/trpc/a,b,c?batch=1"), so a fault on one
// procedure fails the whole batch, exactly like a real failing request would.
export type Fault =
  | { kind: "slow"; ms: number }
  | { kind: "error500" }
  | { kind: "malformedJson" };

function matcher(procedure: string): RegExp {
  const escaped = procedure.replace(/\./g, "\\.");
  return new RegExp(`/trpc/[^?]*\\b${escaped}\\b`);
}

async function apply(route: Route, fault: Fault): Promise<void> {
  if (fault.kind === "slow") {
    await new Promise((resolve) => setTimeout(resolve, fault.ms));
    await route.continue();
    return;
  }
  if (fault.kind === "error500") {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify([
        {
          error: {
            message: "Internal server error",
            code: -32603,
            data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
          },
        },
      ]),
    });
    return;
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: "{not json" });
}

export async function injectFault(page: Page, procedure: string, fault: Fault): Promise<void> {
  await page.route(matcher(procedure), (route) => apply(route, fault));
}
