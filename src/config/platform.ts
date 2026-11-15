/**
 * Facts about the vibe/vibe launchpad that Liftoff relies on.
 *
 * Liftoff is unofficial. These values were read from the public app and docs
 * on the date in `verifiedOn`. Anything listed under `unverified` must never
 * be shown to visitors as fact.
 */
export const PLATFORM = {
  name: "vibe/vibe",
  appUrl: "https://testnet.vibevibe.fun",
  docsUrl: "https://testnet.vibevibe.fun/docs/",
  tokenPageUrl: (address: string) => `https://testnet.vibevibe.fun/token/${address}`,
  token: {
    standard: "ERC-20",
    decimals: 18,
    /** Whole tokens. Every vibe/vibe token has the same fixed supply. */
    totalSupplyWhole: 1_000_000_000n,
    taxPercents: [1, 2, 3],
  },
  categories: {
    meme: "Meme & Artcoins",
    product: "Product & Utility",
    rwa: "RWA & Stocks",
  },
  supportedWallets: [
    { name: "MetaMask", url: "https://metamask.io/download/" },
    { name: "Rabby", url: "https://rabby.io/" },
  ],
  unverified: [
    "Bonding or graduated state, and curve progress (no verified ABI). Never computed or displayed.",
    "Which holder addresses are the curve, pool or reserve. Contracts are only tagged as 'Contract'.",
    "The explorer's rate-limit window. Responses are cached for 60 seconds and failures degrade gracefully.",
    "Mainnet values. Only the testnet profile exists.",
  ],
  source: "https://testnet.vibevibe.fun/docs/ and the public explorer",
  verifiedOn: "2026-11-15",
} as const;

export type Look = keyof typeof PLATFORM.categories;
