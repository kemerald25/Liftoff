import http from "node:http";
import { expect, test } from "@playwright/test";
import { E2E_CONFIG_STRING, E2E_HOLDER, E2E_HOLDER_STRING, E2E_SITE, PORTS, TOKEN, urlFor } from "./fixtures";
import { mockChain } from "./support/browser";

const KIT_LABEL = "Unofficial community tool. Not affiliated with or endorsed by vibe/vibe.";

test.use({ baseURL: urlFor("kit") });

test.describe("kit mode (no config)", () => {
  test("home page explains Liftoff and carries the unofficial label", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("real project site");
    await expect(page.getByText(KIT_LABEL).first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Setup status" })).toContainText("Finish setup");
    await expect(page.getByText("no monetary value").first()).toBeVisible();

    await expect(page.getByRole("link", { name: "See a live demo" })).toHaveAttribute("href", "/demo");
    await expect(page.getByRole("link", { name: "Open Preflight" })).toHaveAttribute(
      "href",
      "https://preflight-sim.vercel.app",
    );
    const deploy = await page.getByRole("link", { name: "Deploy to Vercel" }).getAttribute("href");
    const params = new URL(deploy ?? "").searchParams;
    expect(deploy).toContain("https://vercel.com/new/clone?");
    expect(params.get("env")).toBe("NEXT_PUBLIC_LIFTOFF_CONFIG");
    expect(params.get("repository-url")).toContain("github.com");
    expect(params.get("envDescription")).toBeTruthy();
    expect(params.get("envLink")).toBe("https://liftoff-vibe.vercel.app/setup");

    // No price or trading language in default copy.
    const text = (await page.locator("body").innerText()).toLowerCase();
    for (const phrase of ["buy now", "price chart", "guaranteed", "to the moon"]) expect(text).not.toContain(phrase);
  });

  test("Finish setup banner is hidden on the official host and shown everywhere else", async () => {
    // Ask the same server for the home page under different Host headers.
    const fetchHome = (host: string) =>
      new Promise<string>((resolve, reject) => {
        const request = http.get(
          { hostname: "127.0.0.1", port: PORTS.kit, path: "/", headers: { Host: host } },
          (response) => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => (body += chunk));
            response.on("end", () => resolve(body));
          },
        );
        request.on("error", reject);
      });

    const official = await fetchHome("liftoff-vibe.vercel.app");
    expect(official).toContain("real project site");
    expect(official).toContain(KIT_LABEL);
    expect(official).not.toContain("Finish setup.");
    expect(official).not.toContain('aria-label="Setup status"');

    for (const host of ["my-liftoff-site.vercel.app", `localhost:${PORTS.kit}`, "liftoff-vibe.vercel.app.evil.example", "liftoff-kit.vercel.app"]) {
      const other = await fetchHome(host);
      expect(other, host).toContain("Finish setup.");
      expect(other, host).toContain('aria-label="Setup status"');
    }
  });

  test("guide, showcase and demo render; project routes do not exist", async ({ page }) => {
    await page.goto("/guide");
    await expect(page.getByRole("heading", { name: "Editing your site later" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Using a custom domain" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customising with an AI coding agent" })).toBeVisible();

    await page.goto("/showcase");
    await expect(page.getByText("Listing is not endorsement or review.")).toBeVisible();

    await page.goto("/demo");
    await expect(page.getByRole("heading", { level: 1, name: "Liftoff sample project" })).toBeVisible();
    await expect(page.getByTestId("token-address")).toHaveText(TOKEN);
    await expect(page.getByText("not an endorsement").first()).toBeVisible();
    await expect(page.getByText(KIT_LABEL).first()).toBeVisible();

    expect((await page.goto("/holders"))?.status()).toBe(404);
    const gate = await page.request.post("/api/holders", { data: { message: "x", signature: "0x00" } });
    expect(gate.status()).toBe(404);
    expect(await gate.json()).toMatchObject({ ok: false, error: "disabled" });
  });

  test("Open Graph image is served and is a PNG", async ({ request }) => {
    const response = await request.get("/og");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("wizard validates the token and produces the strings the project server runs on", async ({ page }) => {
    await mockChain(page);
    await page.goto("/setup");
    await expect(page.getByRole("heading", { level: 1, name: "Setup wizard" })).toBeVisible();

    // A bad address is caught before anything else.
    await page.getByTestId("token-input").fill("0x1234");
    await expect(page.getByTestId("token-status")).toContainText("not a valid address");

    // The real address is checked live and shows what was found on chain.
    await page.getByTestId("token-input").fill(TOKEN);
    await expect(page.getByTestId("token-status")).toContainText("VIBE MORNING");
    await expect(page.getByTestId("token-status")).toContainText("VIBEMORNING");
    await expect(page.getByTestId("token-status")).toContainText("1,000,000,000");

    await page.getByTestId("look-product").check();
    await page.getByTestId("name-input").fill(E2E_SITE.name);
    await page.getByTestId("tagline-input").fill(E2E_SITE.tagline);
    await page.getByTestId("description-input").fill(E2E_SITE.description);
    await expect(page.getByTestId("config-error")).toHaveCount(0);

    // Non-https links are rejected with a plain message.
    await page.getByTestId("link-website").fill("http://example.com/morning");
    await expect(page.getByTestId("config-error")).toContainText("https://");
    await expect(page.getByTestId("public-config")).toHaveValue("");
    await page.getByTestId("link-website").fill(E2E_SITE.links.website);
    await page.getByTestId("link-demo").fill(E2E_SITE.links.demo);

    const features = E2E_SITE.sections[0];
    await page.getByTestId("add-features").click();
    await page.getByTestId("section-0").getByLabel("Heading").fill(features.title);
    await page.getByTestId("section-0-item-0-title").fill(features.items[0].title);
    await page.getByTestId("section-0-item-0-text").fill(features.items[0].text);
    await page.getByTestId("section-0").getByRole("button", { name: "Add an item" }).click();
    await page.getByTestId("section-0-item-1-title").fill(features.items[1].title);
    await page.getByTestId("section-0-item-1-text").fill(features.items[1].text);

    // Holder area: the private string appears only once it is enabled and filled in.
    await expect(page.getByTestId("private-content")).toHaveCount(0);
    await page.getByTestId("gate-toggle").check();
    await expect(page.getByText("What it cannot prevent.")).toBeVisible();
    await expect(page.getByText("Never sent anywhere")).toBeVisible();
    await page.getByTestId("gate-min").fill(E2E_SITE.gate.minTokens);
    await page.getByTestId("gate-title").fill(E2E_SITE.gate.title);
    await page.getByTestId("gate-teaser").fill(E2E_SITE.gate.teaser);
    await expect(page.getByTestId("holder-error")).toBeVisible();
    await page.getByTestId("holder-body").fill(E2E_HOLDER.body);

    // The wizard's output is exactly what the project-mode test server was built with.
    await expect(page.getByTestId("public-config")).toHaveValue(E2E_CONFIG_STRING);
    await expect(page.getByTestId("private-content")).toHaveValue(E2E_HOLDER_STRING);
    await expect(page.getByText(/\d[\d,]* of 16,000 characters/)).toBeVisible();

    // Live preview shows the content and live token data, and never the private text.
    const preview = page.getByTestId("preview");
    await expect(preview.getByRole("heading", { level: 1, name: E2E_SITE.name })).toBeVisible();
    await expect(preview.getByTestId("token-address")).toHaveText(TOKEN);
    await expect(preview.getByRole("heading", { name: "Sunrise timer" })).toBeVisible();
    await expect(preview.getByText("31", { exact: true })).toBeVisible();
    await expect(preview).not.toContainText("secret roast");

    // Deploy button asks for both variables once a holder area exists.
    const deploy = await page.getByTestId("deploy-button").getAttribute("href");
    expect(new URL(deploy ?? "").searchParams.get("env")).toBe("NEXT_PUBLIC_LIFTOFF_CONFIG,LIFTOFF_HOLDER_CONTENT");

    // State lives in the URL hash, so a refresh keeps the work. The private text is not in the URL.
    await expect
      .poll(() => page.evaluate(() => atob(location.hash.slice(3).replace(/-/g, "+").replace(/_/g, "/"))))
      .toContain("Holders get the weekly notes.");
    expect(page.url()).not.toContain(E2E_HOLDER_STRING);
    await page.reload();
    await expect(page.getByTestId("name-input")).toHaveValue(E2E_SITE.name);
    await expect(page.getByTestId("public-config")).toHaveValue(E2E_CONFIG_STRING);
    await expect(page.getByTestId("private-content")).toHaveValue(E2E_HOLDER_STRING);
  });

  test("Import config restores a site from its strings", async ({ page }) => {
    await mockChain(page);
    await page.goto("/setup");
    await page.getByTestId("import-toggle").click();

    await page.getByTestId("import-public").fill("definitely-not-a-config");
    await page.getByTestId("import-run").click();
    await expect(page.getByTestId("import-message")).toContainText("could not be read");

    await page.getByTestId("import-public").fill(E2E_CONFIG_STRING);
    await page.getByTestId("import-private").fill(E2E_HOLDER_STRING);
    await page.getByTestId("import-run").click();
    await expect(page.getByTestId("import-message")).toContainText("Imported");

    await expect(page.getByTestId("name-input")).toHaveValue(E2E_SITE.name);
    await expect(page.getByTestId("token-input")).toHaveValue(TOKEN);
    await expect(page.getByTestId("holder-body")).toHaveValue(E2E_HOLDER.body);
    await expect(page.getByTestId("public-config")).toHaveValue(E2E_CONFIG_STRING);

    // Editing changes the string.
    await page.getByTestId("tagline-input").fill("A new tagline.");
    await expect(page.getByTestId("public-config")).not.toHaveValue(E2E_CONFIG_STRING);
    await expect(page.getByTestId("public-config")).not.toHaveValue("");
  });

  test("wizard still works when the network cannot be reached", async ({ page }) => {
    await mockChain(page, { rpcDown: true, explorerDown: true });
    await page.goto("/setup");
    await page.getByTestId("token-input").fill(TOKEN);
    await expect(page.getByTestId("token-status")).toContainText("could not be reached");
  });
});
