import "server-only";
import type { Address, Hex, PublicClient } from "viem";
import { CHAIN } from "@/config/chain";
import { decodeHolderContent, type HolderContent, type SiteConfig } from "@/lib/config";
import { parseSignInMessage } from "@/lib/siwe";
import { meetsThreshold, readBalance, readDecimals } from "@/lib/token";

/**
 * Server-side holder gate. This module is the only place that reads the
 * private holder content, and `server-only` makes the build fail if client
 * code ever imports it.
 *
 * The gate is stateless: no cookies, no sessions, no secret key. Nothing in
 * here logs messages, signatures or content.
 */

export const GATE_LIMITS = {
  maxBodyBytes: 16_384,
  maxSignatureChars: 12_000,
  maxAgeMs: 5 * 60_000,
  clockSkewMs: 30_000,
  rateLimit: 12,
  rateWindowMs: 60_000,
} as const;

export type GateError = "bad_request" | "refused" | "unavailable" | "rate_limited" | "disabled";

export type GateBody =
  | { ok: true; content: HolderContent }
  | { ok: false; error: GateError; message: string };

export type GateOutcome = { status: number; body: GateBody };

/** One uniform answer per failure class, so responses reveal nothing about the content. */
export const GATE_FAILURES: Record<GateError, GateOutcome> = {
  bad_request: fail(400, "bad_request", "The request was not understood."),
  refused: fail(
    403,
    "refused",
    "The server could not confirm this sign-in. Check that this wallet holds enough tokens and that your device clock is right, then try again.",
  ),
  unavailable: fail(503, "unavailable", "The network could not be reached. Please try again shortly."),
  rate_limited: fail(429, "rate_limited", "Too many attempts. Please wait a minute and try again."),
  disabled: fail(404, "disabled", "The holder area is not available on this site."),
};

function fail(status: number, error: GateError, message: string): GateOutcome {
  return { status, body: { ok: false, error, message } };
}

/**
 * Returns the holder content only when the gate is fully configured: the
 * public config has a gate and the private variable decodes. Otherwise the
 * holder area is switched off.
 */
export function loadHolderContent(
  config: SiteConfig | null,
  holderContentRaw: string | undefined,
): HolderContent | null {
  if (!config?.gate || !holderContentRaw) return null;
  const decoded = decodeHolderContent(holderContentRaw);
  return decoded.ok ? decoded.value : null;
}

export function isHolderAreaEnabled(config: SiteConfig | null): boolean {
  return loadHolderContent(config, process.env.LIFTOFF_HOLDER_CONTENT) !== null;
}

const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1)(:[0-9]{1,5})?$/;

/** The signed origin must be this site: same host, https (http only on localhost). */
export function originMatchesHost(origin: string, host: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.host.toLowerCase() !== host.toLowerCase()) return false;
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && LOCAL_HOSTS.test(host);
}

const decimalsCache = new Map<Address, number>();

async function tokenDecimals(client: Pick<PublicClient, "readContract">, token: Address) {
  const known = decimalsCache.get(token);
  if (known !== undefined) return known;
  const decimals = await readDecimals(client, token);
  decimalsCache.set(token, decimals);
  return decimals;
}

export type GateRequest = {
  /** Parsed JSON body. */
  body: unknown;
  /** The request's own Host header. */
  host: string | null;
  /** The request's Origin header, when the browser sent one. */
  originHeader: string | null;
  /** Current time in milliseconds. */
  now: number;
  config: SiteConfig | null;
  holderContentRaw: string | undefined;
  client: Pick<PublicClient, "readContract" | "verifyMessage">;
};

export async function evaluateGateRequest(request: GateRequest): Promise<GateOutcome> {
  const content = loadHolderContent(request.config, request.holderContentRaw);
  const gate = request.config?.gate;
  if (!content || !gate || !request.config) return GATE_FAILURES.disabled;

  // 1. Parse strictly.
  const body = request.body as { message?: unknown; signature?: unknown } | null;
  if (typeof body !== "object" || body === null) return GATE_FAILURES.bad_request;
  const { message, signature } = body;
  if (
    typeof message !== "string" ||
    typeof signature !== "string" ||
    signature.length > GATE_LIMITS.maxSignatureChars ||
    !/^0x(?:[0-9a-fA-F]{2})+$/.test(signature)
  ) {
    return GATE_FAILURES.bad_request;
  }
  const fields = parseSignInMessage(message);
  if (!fields) return GATE_FAILURES.refused;

  // 2. The signature must have been made for this site.
  const host = request.host?.toLowerCase();
  if (!host || fields.domain.toLowerCase() !== host) return GATE_FAILURES.refused;
  if (!originMatchesHost(fields.origin, host)) return GATE_FAILURES.refused;
  if (request.originHeader && request.originHeader !== fields.origin) return GATE_FAILURES.refused;

  // 3. Right chain, fresh timestamp.
  if (fields.chainId !== CHAIN.id) return GATE_FAILURES.refused;
  const issuedAt = Date.parse(fields.issuedAt);
  if (issuedAt > request.now + GATE_LIMITS.clockSkewMs) return GATE_FAILURES.refused;
  if (issuedAt < request.now - GATE_LIMITS.maxAgeMs) return GATE_FAILURES.refused;

  // 4. Verify the signature (ordinary and smart-contract wallets).
  let signatureValid: boolean;
  try {
    signatureValid = await request.client.verifyMessage({
      address: fields.address,
      message,
      signature: signature as Hex,
    });
  } catch {
    return GATE_FAILURES.unavailable;
  }
  if (!signatureValid) return GATE_FAILURES.refused;

  // 5. Read the balance now, from the chain, and compare with bigint.
  let eligible: boolean;
  try {
    const [decimals, balance] = await Promise.all([
      tokenDecimals(request.client, request.config.token),
      readBalance(request.client, request.config.token, fields.address),
    ]);
    eligible = meetsThreshold(balance, gate.minTokens, decimals);
  } catch {
    return GATE_FAILURES.unavailable;
  }
  if (!eligible) return GATE_FAILURES.refused;

  // 6. Only now release the content.
  return { status: 200, body: { ok: true, content } };
}

/* ---------- best-effort throttling ---------- */

export type RateLimiter = { allow: (key: string, now: number) => boolean };

/**
 * In-memory fixed-window limiter. On serverless hosting each instance has
 * its own memory, so this only slows abuse down; it is not a guarantee.
 */
export function createRateLimiter(limit: number, windowMs: number, maxKeys = 5_000): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    allow(key, now) {
      const current = windows.get(key);
      if (!current || now - current.start >= windowMs) {
        if (windows.size >= maxKeys) {
          for (const [storedKey, entry] of windows) {
            if (now - entry.start >= windowMs) windows.delete(storedKey);
          }
          if (windows.size >= maxKeys) windows.clear();
        }
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= limit;
    },
  };
}
