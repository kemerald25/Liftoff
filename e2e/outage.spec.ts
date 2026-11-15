import { expect, test } from "@playwright/test";
import { E2E_SITE, TOKEN, urlFor } from "./fixtures";

test.use({ baseURL: urlFor("outage") });

test.describe("explorer outage", () => {
  test("project page still renders, with a graceful fallback for live data", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    // Everything that does not need the explorer is intact.
    await expect(page.getByRole("heading", { level: 1, name: E2E_SITE.name })).toBeVisible();
    await expect(page.getByTestId("token-address")).toHaveText(TOKEN);
    await expect(page.getByText("Verify this address before you trust any site.")).toBeVisible();
    await expect(page.getByRole("link", { name: /View on vibe\/vibe/ }).first()).toBeVisible();
    await expect(page.getByTestId("project-label")).toBeVisible();

    // Live data degrades to a clear message instead of an error page.
    const stats = page.locator("section", { has: page.getByRole("heading", { name: "Live token data" }) });
    await expect(stats.getByText("Unavailable", { exact: true })).toHaveCount(3);
    await expect(page.getByTestId("stats-note")).toContainText("Live data is unavailable right now");
    await expect(page.getByText("The holder list is unavailable right now")).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  test("holder area is switched off when the private variable is missing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Holder area" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Early bird notes" })).toHaveCount(0);

    await page.goto("/holders");
    await expect(page.getByTestId("holder-state")).toHaveAttribute("data-state", "switched-off");
    const gate = await page.request.post("/api/holders", { data: { message: "x", signature: "0x00" } });
    expect(gate.status()).toBe(404);
  });
});
