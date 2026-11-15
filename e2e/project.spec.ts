import { expect, test } from "@playwright/test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { E2E_SITE, ONE_TOKEN, TOKEN, holderWallet, smallWallet, urlFor } from "./fixtures";
import { installWallet, mockChain, setRejectSign, walletCalls } from "./support/browser";

const PROJECT_LABEL =
  "Made with Liftoff, an unofficial community kit. This site is run by the project's creator, who is solely responsible for its content. Not affiliated with or endorsed by vibe/vibe or Liftoff.";

const balancesFor = (address: string, tokens: bigint) => ({ [address.toLowerCase()]: (tokens * ONE_TOKEN).toString() });
const state = (page: import("@playwright/test").Page) => page.getByTestId("holder-state");

test.use({ baseURL: urlFor("project") });

test.describe("project mode: home page", () => {
  test("renders the wizard's content with live token data and all safety elements", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Morning Tools \(VIBEMORNING\)/);
    await expect(page.getByRole("heading", { level: 1, name: E2E_SITE.name })).toBeVisible();
    await expect(page.getByText(E2E_SITE.tagline)).toBeVisible();
    await expect(page.locator("strong", { hasText: "sunrise timer" })).toBeVisible();
    await expect(page.getByText("Works in any browser")).toBeVisible();
    await expect(page.getByRole("heading", { name: "What you can try" }).last()).toBeVisible();
    await expect(page.getByText("Coffee log")).toBeVisible();

    // Contract address: full, with copy, explorer link and the verify line.
    await expect(page.getByTestId("token-address")).toHaveText(TOKEN);
    await expect(page.getByRole("button", { name: /Copy address/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open in explorer/ })).toHaveAttribute(
      "href",
      `https://explorer.testnet.chain.robinhood.com/token/${TOKEN}`,
    );
    await expect(page.getByText("Verify this address before you trust any site.")).toBeVisible();

    // Call to action and demo link.
    for (const link of await page.getByRole("link", { name: /View on vibe\/vibe/ }).all()) {
      await expect(link).toHaveAttribute("href", `https://testnet.vibevibe.fun/token/${TOKEN}`);
    }
    await expect(page.getByRole("link", { name: /Try the demo/ })).toHaveAttribute("href", E2E_SITE.links.demo);

    // Live stats from the (mocked) explorer.
    const stats = page.locator("section", { has: page.getByRole("heading", { name: "Live token data" }) });
    await expect(stats).toContainText("1,000,000,000");
    await expect(stats).toContainText("31");
    await expect(stats).toContainText("85");
    await expect(page.getByTestId("stats-note")).toContainText(/From the explorer, updated/);

    // Top holders: contracts are tagged, with share of supply, and no loaded words.
    const table = page.getByRole("table");
    await expect(table.getByRole("row")).toHaveCount(5);
    await expect(table.getByText("Contract", { exact: true })).toHaveCount(2);
    await expect(table).toContainText("56.75%");
    await expect(page.getByText("can include the launchpad's curve and liquidity")).toBeVisible();

    // Required labels.
    await expect(page.getByTestId("project-label")).toHaveText(PROJECT_LABEL);
    await expect(page.getByText("have no monetary value").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Early bird notes" })).toBeVisible();

    const text = (await page.locator("body").innerText()).toLowerCase();
    for (const phrase of ["buy now", "whale", "price chart", "guaranteed", "secret roast"]) {
      expect(text).not.toContain(phrase);
    }
    // No vibe/vibe brand assets: the only images are the project's own.
    expect(await page.locator('img[src*="vibevibe"], img[src*="vibe.fun"]').count()).toBe(0);
  });

  test("kit routes do not exist and the Open Graph image is served", async ({ page, request }) => {
    expect((await page.goto("/setup"))?.status()).toBe(404);
    expect((await page.goto("/guide"))?.status()).toBe(404);
    const og = await request.get("/og");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");
  });

  test("header stays fixed while scrolling and collapses into a menu on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await page.goto("/");
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
    await page.getByTestId("menu-button").click();
    await expect(page.getByTestId("mobile-menu").getByRole("link", { name: "Holder area" })).toBeVisible();
    await page.getByTestId("mobile-menu").getByRole("link", { name: "Holder area" }).click();
    await expect(page).toHaveURL(/\/holders$/);
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);

    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByTestId("menu-button")).toBeInViewport();
    // Nothing overflows sideways at 360px.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });

  test("theme toggle switches and remembers the theme", async ({ page }) => {
    await page.goto("/");
    const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.getByRole("button", { name: /theme/i }).click();
    const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(after).not.toBe(before);
    await page.reload();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(after);
  });
});

test.describe("project mode: holder gate API", () => {
  test("is POST only, never cached, and gives nothing away", async ({ request }) => {
    const get = await request.get("/api/holders");
    expect(get.status()).toBe(405);

    const garbage = await request.post("/api/holders", { data: "not json", headers: { "content-type": "text/plain" } });
    expect(garbage.status()).toBe(400);
    expect(garbage.headers()["cache-control"]).toBe("no-store");

    const fake = await request.post("/api/holders", { data: { message: "hello", signature: "0x1234" } });
    expect(fake.status()).toBe(403);
    expect(await fake.text()).not.toContain("secret roast");

    const huge = await request.post("/api/holders", { data: { message: "x".repeat(40_000), signature: "0x00" } });
    expect(huge.status()).toBe(400);
  });
});

test.describe("project mode: holder area states", () => {
  test("no wallet found", async ({ page }) => {
    await page.goto("/holders");
    await expect(state(page)).toHaveAttribute("data-state", "no-wallet");
    await expect(page.getByRole("link", { name: "Get MetaMask" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Rabby" })).toBeVisible();
    await expect(page.getByTestId("project-label")).toBeVisible();
  });

  test("not connected, then wrong network with one-click switch", async ({ page }) => {
    await mockChain(page, { balances: balancesFor(holderWallet.address, 5000n) });
    await installWallet(page, { account: holderWallet, chainId: "0x1" });
    await page.goto("/holders");
    await expect(state(page)).toHaveAttribute("data-state", "not-connected");

    await page.getByRole("button", { name: "Connect wallet" }).click();
    await expect(state(page)).toHaveAttribute("data-state", "wrong-network");
    await expect(state(page)).toContainText("chain ID 46630");

    await page.getByRole("button", { name: /Switch to Robinhood Chain Testnet/ }).click();
    await expect(state(page)).toHaveAttribute("data-state", "eligible");
    expect(await walletCalls(page)).toContain("wallet_switchEthereumChain");
  });

  test("below the threshold: shows balance and threshold, and never asks for a signature", async ({ page }) => {
    await mockChain(page, { balances: balancesFor(smallWallet.address, 12n) });
    await installWallet(page, { account: smallWallet });
    await page.goto("/holders");
    await page.getByRole("button", { name: "Connect wallet" }).click();

    await expect(state(page)).toHaveAttribute("data-state", "below-threshold");
    await expect(page.getByTestId("held-balance")).toHaveText("12 tokens");
    await expect(state(page)).toContainText("1,000 tokens");
    await expect(state(page).getByRole("link", { name: /View on vibe\/vibe/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in/ })).toHaveCount(0);
    expect(await walletCalls(page)).not.toContain("personal_sign");
  });

  test("eligible: explains the signature, handles a decline calmly, then unlocks", async ({ page }) => {
    await mockChain(page, { balances: balancesFor(holderWallet.address, 5000n) });
    await installWallet(page, { account: holderWallet });
    await page.goto("/holders");
    await page.getByRole("button", { name: "Connect wallet" }).click();

    await expect(state(page)).toHaveAttribute("data-state", "eligible");
    await expect(state(page)).toContainText("5,000 tokens");
    await expect(state(page)).toContainText("It is not a transaction, costs no gas, and cannot move your funds.");
    await expect(page.getByTestId("holder-content")).toHaveCount(0);

    await setRejectSign(page, true);
    await page.getByRole("button", { name: "Sign in to unlock" }).click();
    await expect(state(page)).toHaveAttribute("data-state", "declined");
    await expect(state(page)).toContainText("No problem");

    await setRejectSign(page, false);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(state(page)).toHaveAttribute("data-state", "unlocked");
    await expect(page.getByTestId("holder-content")).toContainText("Welcome early bird");
    await expect(page.getByTestId("holder-content").locator("strong")).toHaveText("secret roast");

    // Only the allowed wallet methods were used: no transactions, no typed-data signatures.
    const calls = new Set(await walletCalls(page));
    for (const method of calls) {
      expect(["eth_requestAccounts", "eth_accounts", "eth_chainId", "personal_sign", "wallet_getPermissions", "wallet_requestPermissions"]).toContain(method);
    }

    // Nothing was stored: a reload locks the content again.
    const stored = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, document.cookie]));
    expect(stored).not.toContain("secret roast");
    await page.reload();
    await expect(page.getByTestId("holder-content")).toHaveCount(0);
  });

  test("server refuses when the chain disagrees with the browser", async ({ page }) => {
    // The browser is told this wallet is rich; the server's own balance read says otherwise.
    const stranger = privateKeyToAccount(generatePrivateKey());
    await mockChain(page, { balances: balancesFor(stranger.address, 9000n) });
    await installWallet(page, { account: stranger });
    await page.goto("/holders");
    await page.getByRole("button", { name: "Connect wallet" }).click();
    await page.getByRole("button", { name: "Sign in to unlock" }).click();

    await expect(state(page)).toHaveAttribute("data-state", "refused");
    await expect(state(page)).toContainText("could not confirm");
    await expect(page.getByTestId("holder-content")).toHaveCount(0);
  });

  test("server unavailable shows a clear message", async ({ page }) => {
    await mockChain(page, { balances: balancesFor(holderWallet.address, 5000n) });
    await installWallet(page, { account: holderWallet });
    await page.route("**/api/holders", (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: "unavailable", message: "try again shortly" } }),
    );
    await page.goto("/holders");
    await page.getByRole("button", { name: "Connect wallet" }).click();
    await page.getByRole("button", { name: "Sign in to unlock" }).click();
    await expect(state(page)).toHaveAttribute("data-state", "unavailable");
    await expect(state(page)).toContainText("try again shortly");
  });

  test("balance read failure offers a retry", async ({ page }) => {
    await mockChain(page, { rpcDown: true });
    await installWallet(page, { account: holderWallet });
    await page.goto("/holders");
    await page.getByRole("button", { name: "Connect wallet" }).click();
    await expect(state(page)).toHaveAttribute("data-state", "balance-error", { timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
