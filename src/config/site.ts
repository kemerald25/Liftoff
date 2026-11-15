import { decodeConfig, type DecodeResult, type SiteConfig } from "@/lib/config";

/**
 * Liftoff's own identity. The name is a placeholder kept in this one constant.
 */
export const KIT = {
  name: "Liftoff",
  tagline: "Turn your vibe/vibe token into a live project site in about five minutes.",
  repoUrl: "https://github.com/kemerald25/Liftoff",
  /**
   * Address of the official hosted copy of Liftoff, with no trailing slash.
   * One constant drives everything that needs it: the "Finish setup" banner
   * (hidden on this host only), the metadata base URL and Open Graph card in
   * kit mode, the Deploy Button's help link, and "Make your own site" links.
   */
  homeUrl: "https://liftoff-vibe.vercel.app",
  preflightUrl: "https://preflight-sim.vercel.app",
  /** Arbitrary testnet token used for the built-in demo. Not an endorsement. */
  sampleToken: "0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559",
  labels: {
    kit: "Unofficial community tool. Not affiliated with or endorsed by vibe/vibe.",
    project:
      "Made with Liftoff, an unofficial community kit. This site is run by the project's creator, who is solely responsible for its content. Not affiliated with or endorsed by vibe/vibe or Liftoff.",
    testnet: "Testnet only. Test ETH and testnet tokens have no monetary value.",
    verifyAddress: "Verify this address before you trust any site.",
  },
} as const;

/** True when a request's Host header is the official hosted copy of the kit. */
export function isCanonicalKitHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return host.trim().toLowerCase() === new URL(KIT.homeUrl).host.toLowerCase();
}

/**
 * The "Finish setup" banner shows on every unconfigured deployment except
 * the official one, and always when a config was set but could not be read.
 */
export function showSetupBanner(host: string | null | undefined, configError: string | null): boolean {
  return configError !== null || !isCanonicalKitHost(host);
}

/**
 * Base URL for page metadata and the Open Graph image link.
 *
 * `vercelHost` is VERCEL_PROJECT_PRODUCTION_URL, which Vercel sets by itself
 * (builders never configure it). A deployment uses its own address, so a
 * builder's site never points at Liftoff's. Kit mode off Vercel (local
 * builds) uses the official address.
 */
export function metadataBaseUrl(mode: SiteMode["mode"], vercelHost: string | undefined): URL {
  if (vercelHost && vercelHost.trim() !== "") return new URL(`https://${vercelHost.trim()}`);
  return new URL(mode === "kit" ? KIT.homeUrl : "http://localhost:3000");
}

export const CONFIG_ENV_NAME = "NEXT_PUBLIC_LIFTOFF_CONFIG";
export const HOLDER_ENV_NAME = "LIFTOFF_HOLDER_CONTENT";

export type SiteMode =
  | { mode: "project"; config: SiteConfig }
  | { mode: "kit"; configError: string | null };

let cached: SiteMode | undefined;

/**
 * Decides which of the two modes this deployment runs in. The public config
 * variable is inlined at build time, so the answer is the same on the server
 * and in the browser.
 */
export function getSiteMode(): SiteMode {
  if (cached) return cached;
  const raw = process.env.NEXT_PUBLIC_LIFTOFF_CONFIG;
  if (!raw || raw.trim() === "") {
    cached = { mode: "kit", configError: null };
    return cached;
  }
  const result: DecodeResult<SiteConfig> = decodeConfig(raw);
  cached = result.ok
    ? { mode: "project", config: result.value }
    : { mode: "kit", configError: result.error };
  return cached;
}

/** Deploy Button URL, using the parameters documented by Vercel (checked 2026-11-15). */
export function deployUrl(options: { withHolderContent: boolean }): string {
  const env = options.withHolderContent
    ? [CONFIG_ENV_NAME, HOLDER_ENV_NAME]
    : [CONFIG_ENV_NAME];
  const params = new URLSearchParams({
    "repository-url": KIT.repoUrl,
    env: env.join(","),
    envDescription: options.withHolderContent
      ? "Paste the two strings from the Liftoff setup wizard: the public site config, then the private holder content."
      : "Paste the public site config string from the Liftoff setup wizard.",
    envLink: `${KIT.homeUrl}/setup`,
    "project-name": "my-liftoff-site",
    "repository-name": "my-liftoff-site",
  });
  return `https://vercel.com/new/clone?${params.toString()}`;
}
