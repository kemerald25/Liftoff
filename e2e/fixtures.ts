import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { encodeConfig, encodeHolderContent } from "../src/lib/config";
import * as mock from "./support/mock-data.cjs";

/**
 * Shared test data. The project-mode test server is started with the exact
 * strings below; the wizard test types the same content and must produce
 * the very same strings, which proves wizard output renders project mode.
 */

export const TOKEN = mock.TOKEN as `0x${string}`;
export const ONE_TOKEN = 10n ** 18n;

export const E2E_SITE = {
  v: 1,
  token: TOKEN,
  look: "product",
  name: "Morning Tools",
  tagline: "A tiny toolkit for early risers.",
  description: "Try the **sunrise timer** today.\n\n- Works in any browser\n- Free to use",
  links: { website: "https://example.com/morning", demo: "https://example.com/demo" },
  sections: [
    {
      type: "features",
      title: "What you can try",
      items: [
        { title: "Sunrise timer", text: "Counts down to first light." },
        { title: "Coffee log", text: "Remembers your best brew." },
      ],
    },
  ],
  gate: { minTokens: "1000", title: "Early bird notes", teaser: "Holders get the weekly notes." },
} as const;

export const E2E_HOLDER = {
  v: 1,
  body: "Welcome early bird. The **secret roast** is Ethiopian.",
} as const;

function must(result: { ok: true; value: string } | { ok: false; error: string }): string {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

export const E2E_CONFIG_STRING = must(encodeConfig(E2E_SITE));
export const E2E_HOLDER_STRING = must(encodeHolderContent(E2E_HOLDER));

/**
 * Throwaway wallets, generated fresh for each test run. The keys are passed
 * to Playwright's workers through the environment so every process agrees.
 */
process.env.E2E_HOLDER_KEY ??= generatePrivateKey();
process.env.E2E_SMALL_KEY ??= generatePrivateKey();

export const holderWallet = privateKeyToAccount(process.env.E2E_HOLDER_KEY as `0x${string}`);
export const smallWallet = privateKeyToAccount(process.env.E2E_SMALL_KEY as `0x${string}`);

/** Balances the mocked chain reports to the server. */
export const SERVER_BALANCES: Record<string, string> = {
  [holderWallet.address.toLowerCase()]: (5000n * ONE_TOKEN).toString(),
  [smallWallet.address.toLowerCase()]: (12n * ONE_TOKEN).toString(),
};

export const PORTS = { kit: 3100, project: 3101, outage: 3102 } as const;
export const urlFor = (name: keyof typeof PORTS) => `http://localhost:${PORTS[name]}`;
