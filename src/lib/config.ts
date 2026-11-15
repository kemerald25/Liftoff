import { getAddress, isAddress } from "viem";
import { z } from "zod";

/**
 * The two strings a builder pastes into Vercel:
 *
 *  - the public site config (`NEXT_PUBLIC_LIFTOFF_CONFIG`)
 *  - the private holder content (`LIFTOFF_HOLDER_CONTENT`, server only)
 *
 * Both are versioned JSON, base64url encoded. Everything in them is untrusted
 * user input: it is validated here, length-capped, and only ever rendered as
 * text or through the sanitising Markdown renderer.
 */

export const CONFIG_VERSION = 1;
export const HOLDER_CONTENT_VERSION = 1;

/** Maximum length of each encoded string. Vercel allows 64 KB for all variables combined. */
export const MAX_CONFIG_CHARS = 16_000;
export const MAX_HOLDER_CHARS = 12_000;

export const LIMITS = {
  name: 40,
  tagline: 120,
  description: 2000,
  url: 300,
  sections: 6,
  sectionTitle: 60,
  aboutBody: 1500,
  featureItems: 6,
  roadmapItems: 6,
  faqItems: 8,
  itemTitle: 60,
  itemText: 240,
  faqQuestion: 140,
  faqAnswer: 500,
  gateTitle: 60,
  gateTeaser: 280,
  holderBody: 4000,
  holderLinks: 8,
  holderLinkLabel: 60,
  /** vibe/vibe tokens have a fixed supply of one billion whole tokens. */
  maxMinTokens: 1_000_000_000n,
} as const;

const text = (max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "is required").max(max, `must be ${max} characters or fewer`));

const httpsUrl = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .max(LIMITS.url, `must be ${LIMITS.url} characters or fewer`)
      .refine(isHttpsUrl, "must be a full https:// link"),
  );

export function isHttpsUrl(value: string): boolean {
  if (/[\s<>"'`\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && url.username === "" && url.password === "" && url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

const tokenAddress = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => isAddress(value), "must be a valid contract address (0x followed by 40 hex characters)")
  .transform((value) => getAddress(value));

const hexColour = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.string().regex(/^#[0-9a-f]{6}$/, "must be a hex colour like #dff902"));

const minTokens = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .regex(/^[1-9][0-9]{0,9}$/, "must be a whole number of tokens, 1 or more")
      .refine(
        (value) => !/^[0-9]+$/.test(value) || BigInt(value) <= LIMITS.maxMinTokens,
        "cannot be more than the total supply",
      ),
  );

const linksSchema = z.object({
  website: httpsUrl.optional(),
  demo: httpsUrl.optional(),
  repo: httpsUrl.optional(),
  x: httpsUrl.optional(),
  telegram: httpsUrl.optional(),
  discord: httpsUrl.optional(),
});

export const LINK_KEYS = ["website", "demo", "repo", "x", "telegram", "discord"] as const;
export type LinkKey = (typeof LINK_KEYS)[number];

const titledItem = z.object({
  title: text(LIMITS.itemTitle),
  text: text(LIMITS.itemText).optional(),
});

const sectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("about"),
    title: text(LIMITS.sectionTitle).optional(),
    body: text(LIMITS.aboutBody),
  }),
  z.object({
    type: z.literal("features"),
    title: text(LIMITS.sectionTitle),
    items: z.array(titledItem).min(1, "needs at least one item").max(LIMITS.featureItems),
  }),
  z.object({
    type: z.literal("roadmap"),
    title: text(LIMITS.sectionTitle).optional(),
    items: z.array(titledItem).min(1, "needs at least one item").max(LIMITS.roadmapItems),
  }),
  z.object({
    type: z.literal("faq"),
    title: text(LIMITS.sectionTitle).optional(),
    items: z
      .array(z.object({ q: text(LIMITS.faqQuestion), a: text(LIMITS.faqAnswer) }))
      .min(1, "needs at least one question")
      .max(LIMITS.faqItems),
  }),
]);

const gateSchema = z.object({
  minTokens,
  title: text(LIMITS.gateTitle),
  teaser: text(LIMITS.gateTeaser),
});

export const siteConfigSchema = z.object({
  v: z.literal(CONFIG_VERSION),
  token: tokenAddress,
  look: z.enum(["meme", "product", "rwa"]),
  name: text(LIMITS.name),
  tagline: text(LIMITS.tagline),
  description: text(LIMITS.description),
  imageUrl: httpsUrl.optional(),
  links: linksSchema.optional(),
  sections: z.array(sectionSchema).max(LIMITS.sections).optional(),
  gate: gateSchema.optional(),
  accent: hexColour.optional(),
});

export const holderContentSchema = z.object({
  v: z.literal(HOLDER_CONTENT_VERSION),
  body: text(LIMITS.holderBody),
  links: z
    .array(z.object({ label: text(LIMITS.holderLinkLabel), url: httpsUrl }))
    .max(LIMITS.holderLinks)
    .optional(),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type GateConfig = z.infer<typeof gateSchema>;
export type HolderContent = z.infer<typeof holderContentSchema>;

export type DecodeResult<T> = { ok: true; value: T } | { ok: false; error: string };

/* ---------- base64url ---------- */

export function toBase64Url(textValue: string): string {
  const bytes = new TextEncoder().encode(textValue);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(encoded: string): string {
  if (!/^[A-Za-z0-9_-]*$/.test(encoded)) throw new Error("not base64url");
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (encoded.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/* ---------- validation helpers ---------- */

function describeIssues(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "is not valid";
  const path = issue.path.length > 0 ? issue.path.join(".") : "value";
  return `${path} ${issue.message}`;
}

/** Validates an in-memory object (for example the wizard's draft). */
export function validateConfig(input: unknown): DecodeResult<SiteConfig> {
  const parsed = siteConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: describeIssues(parsed.error) };
  return { ok: true, value: parsed.data };
}

export function validateHolderContent(input: unknown): DecodeResult<HolderContent> {
  const parsed = holderContentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: describeIssues(parsed.error) };
  return { ok: true, value: parsed.data };
}

/* ---------- migration ---------- */

function readVersion(raw: unknown, what: string): number {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`The ${what} is not a Liftoff ${what}.`);
  }
  const version = (raw as { v?: unknown }).v;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new Error(`The ${what} has no version number.`);
  }
  return version;
}

/**
 * Upgrades an older config object to the current version. Each future
 * version adds one step here, so strings made by old wizards keep working.
 */
export function migrateConfig(raw: unknown): unknown {
  const version = readVersion(raw, "site config");
  if (version > CONFIG_VERSION) {
    throw new Error(
      `This site config was made with a newer version of Liftoff (version ${version}). Update your copy of Liftoff to use it.`,
    );
  }
  // Version 1 is current. Future steps: if (version === 1) raw = v1ToV2(raw) ...
  return raw;
}

export function migrateHolderContent(raw: unknown): unknown {
  const version = readVersion(raw, "holder content");
  if (version > HOLDER_CONTENT_VERSION) {
    throw new Error(
      `This holder content was made with a newer version of Liftoff (version ${version}). Update your copy of Liftoff to use it.`,
    );
  }
  return raw;
}

/* ---------- encode / decode ---------- */

function encodeWith<T>(
  validate: (input: unknown) => DecodeResult<T>,
  maxChars: number,
  what: string,
  input: unknown,
): DecodeResult<string> {
  const valid = validate(input);
  if (!valid.ok) return valid;
  const encoded = toBase64Url(JSON.stringify(valid.value));
  if (encoded.length > maxChars) {
    return {
      ok: false,
      error: `The ${what} is too large (${encoded.length} characters, the limit is ${maxChars}). Shorten some text.`,
    };
  }
  return { ok: true, value: encoded };
}

function decodeWith<T>(
  validate: (input: unknown) => DecodeResult<T>,
  migrate: (raw: unknown) => unknown,
  maxChars: number,
  what: string,
  encoded: string,
): DecodeResult<T> {
  const trimmed = encoded.trim();
  if (trimmed === "") return { ok: false, error: `The ${what} is empty.` };
  if (trimmed.length > maxChars) {
    return {
      ok: false,
      error: `The ${what} is too large (${trimmed.length} characters, the limit is ${maxChars}).`,
    };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(trimmed));
  } catch {
    return {
      ok: false,
      error: `The ${what} could not be read. Copy the whole string from the setup wizard again.`,
    };
  }
  try {
    raw = migrate(raw);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : `The ${what} is not valid.` };
  }
  const valid = validate(raw);
  if (!valid.ok) return { ok: false, error: `The ${what} is not valid: ${valid.error}.` };
  return valid;
}

export function encodeConfig(input: unknown): DecodeResult<string> {
  return encodeWith(validateConfig, MAX_CONFIG_CHARS, "site config", input);
}

export function decodeConfig(encoded: string): DecodeResult<SiteConfig> {
  return decodeWith(validateConfig, migrateConfig, MAX_CONFIG_CHARS, "site config", encoded);
}

export function encodeHolderContent(input: unknown): DecodeResult<string> {
  return encodeWith(validateHolderContent, MAX_HOLDER_CHARS, "holder content", input);
}

export function decodeHolderContent(encoded: string): DecodeResult<HolderContent> {
  return decodeWith(
    validateHolderContent,
    migrateHolderContent,
    MAX_HOLDER_CHARS,
    "holder content",
    encoded,
  );
}
