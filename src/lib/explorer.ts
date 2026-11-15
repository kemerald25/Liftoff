import { getAddress, isAddress, type Address } from "viem";
import { z } from "zod";
import { CHAIN } from "@/config/chain";

/**
 * Blockscout explorer client. Tokens are looked up by contract address only,
 * never by name or symbol (many unrelated tokens share names).
 *
 * The explorer is treated as unreliable: every field is optional, responses
 * are cached for 60 seconds on the server, and failures return the last good
 * answer or `null` instead of throwing.
 */

const digits = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^[0-9]+$/.test(value));

const optionalDigits = digits.nullish().catch(undefined);
const optionalText = z.string().nullish().catch(undefined);

const tokenInfoSchema = z.object({
  name: optionalText,
  symbol: optionalText,
  decimals: optionalDigits,
  total_supply: optionalDigits,
  holders_count: optionalDigits,
  type: optionalText,
});

const countersSchema = z.object({
  token_holders_count: optionalDigits,
  transfers_count: optionalDigits,
});

const holderItemSchema = z.object({
  value: digits,
  address: z.object({
    hash: z.string().refine((value) => isAddress(value, { strict: false })),
    is_contract: z.boolean().nullish().catch(undefined),
    name: optionalText,
  }),
});

const holdersSchema = z.object({ items: z.array(z.unknown()) });

export type TokenInfo = {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: bigint | null;
  holdersCount: bigint | null;
  type: string | null;
};

export type TokenCounters = { holdersCount: bigint | null; transfersCount: bigint | null };

export type TokenHolder = {
  address: Address;
  value: bigint;
  isContract: boolean;
  name: string | null;
};

const toBigInt = (value: string | null | undefined) => (value == null ? null : BigInt(value));
const cleanText = (value: string | null | undefined, max: number) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

export function parseTokenInfo(raw: unknown): TokenInfo | null {
  const parsed = tokenInfoSchema.safeParse(raw);
  if (!parsed.success) return null;
  const decimals = parsed.data.decimals == null ? null : Number(parsed.data.decimals);
  return {
    name: cleanText(parsed.data.name, 80),
    symbol: cleanText(parsed.data.symbol, 32),
    decimals: decimals !== null && decimals <= 77 ? decimals : null,
    totalSupply: toBigInt(parsed.data.total_supply),
    holdersCount: toBigInt(parsed.data.holders_count),
    type: cleanText(parsed.data.type, 20),
  };
}

export function parseCounters(raw: unknown): TokenCounters | null {
  const parsed = countersSchema.safeParse(raw);
  if (!parsed.success) return null;
  return {
    holdersCount: toBigInt(parsed.data.token_holders_count),
    transfersCount: toBigInt(parsed.data.transfers_count),
  };
}

/** Parses the ranked holder list, skipping any malformed rows. */
export function parseHolders(raw: unknown, limit = 10): TokenHolder[] | null {
  const parsed = holdersSchema.safeParse(raw);
  if (!parsed.success) return null;
  const holders: TokenHolder[] = [];
  for (const item of parsed.data.items) {
    const row = holderItemSchema.safeParse(item);
    if (!row.success) continue;
    holders.push({
      address: getAddress(row.data.address.hash),
      value: BigInt(row.data.value),
      isContract: row.data.address.is_contract === true,
      name: cleanText(row.data.address.name, 60),
    });
    if (holders.length >= limit) break;
  }
  return holders;
}

/* ---------- fetching ---------- */

type Fetched<T> = { data: T; fetchedAt: number };

/** Last good answers, kept in memory so an outage can still show cached data. */
const lastGood = new Map<string, Fetched<unknown>>();

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${CHAIN.explorerApiUrl}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
    // Server: cache in Next's data cache. Ignored in the browser.
    next: { revalidate: CHAIN.explorerCacheSeconds },
  } as RequestInit);
  if (!response.ok) throw new Error(`explorer responded ${response.status}`);
  return response.json();
}

async function load<T>(path: string, parse: (raw: unknown) => T | null): Promise<Fetched<T> | null> {
  try {
    const data = parse(await fetchJson(path));
    if (data === null) throw new Error("unexpected explorer response");
    const fetched = { data, fetchedAt: Date.now() };
    lastGood.set(path, fetched);
    return fetched;
  } catch {
    return (lastGood.get(path) as Fetched<T> | undefined) ?? null;
  }
}

export type TokenSnapshot = {
  info: TokenInfo | null;
  counters: TokenCounters | null;
  holders: TokenHolder[] | null;
  /** Milliseconds since epoch of the oldest piece of data shown, or null if nothing loaded. */
  fetchedAt: number | null;
};

export const EMPTY_SNAPSHOT: TokenSnapshot = {
  info: null,
  counters: null,
  holders: null,
  fetchedAt: null,
};

/** Everything a project page shows from the explorer. Never throws. */
export async function getTokenSnapshot(token: Address): Promise<TokenSnapshot> {
  const [info, counters, holders] = await Promise.all([
    load(`/tokens/${token}`, parseTokenInfo),
    load(`/tokens/${token}/counters`, parseCounters),
    load(`/tokens/${token}/holders`, (raw) => parseHolders(raw, 10)),
  ]);
  const times = [info, counters, holders].flatMap((part) => (part ? [part.fetchedAt] : []));
  return {
    info: info?.data ?? null,
    counters: counters?.data ?? null,
    holders: holders?.data ?? null,
    fetchedAt: times.length > 0 ? Math.min(...times) : null,
  };
}

export async function getTokenInfo(token: Address): Promise<TokenInfo | null> {
  return (await load(`/tokens/${token}`, parseTokenInfo))?.data ?? null;
}
