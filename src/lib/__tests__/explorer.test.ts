import { describe, expect, it } from "vitest";
import { parseCounters, parseHolders, parseTokenInfo } from "@/lib/explorer";

/** Shapes copied from the live explorer on 2026-11-15 (trimmed). */
const tokenResponse = {
  address_hash: "0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559",
  circulating_market_cap: null,
  decimals: "18",
  exchange_rate: null,
  holders_count: "31",
  icon_url: null,
  name: "VIBE MORNING",
  symbol: "VIBEMORNING",
  total_supply: "1000000000000000000000000000",
  type: "ERC-20",
};

const holder = (hash: string, value: string, isContract: boolean, name: string | null = null) => ({
  address: { hash, is_contract: isContract, name, is_verified: false },
  token_id: null,
  value,
});

describe("explorer parsing", () => {
  it("parses a token response", () => {
    expect(parseTokenInfo(tokenResponse)).toEqual({
      name: "VIBE MORNING",
      symbol: "VIBEMORNING",
      decimals: 18,
      totalSupply: 10n ** 27n,
      holdersCount: 31n,
      type: "ERC-20",
    });
  });

  it("tolerates missing, null and malformed fields", () => {
    expect(parseTokenInfo({})).toEqual({
      name: null,
      symbol: null,
      decimals: null,
      totalSupply: null,
      holdersCount: null,
      type: null,
    });
    const odd = parseTokenInfo({ name: 42, symbol: "  ", decimals: "abc", total_supply: "-5", holders_count: null });
    expect(odd).toEqual({
      name: null,
      symbol: null,
      decimals: null,
      totalSupply: null,
      holdersCount: null,
      type: null,
    });
    expect(parseTokenInfo(null)).toBeNull();
    expect(parseTokenInfo("oops")).toBeNull();
    expect(parseTokenInfo({ decimals: "999" })?.decimals).toBeNull();
  });

  it("caps very long names", () => {
    expect(parseTokenInfo({ name: "x".repeat(500) })?.name).toHaveLength(80);
  });

  it("parses counters, including missing fields", () => {
    expect(parseCounters({ token_holders_count: "31", transfers_count: "85" })).toEqual({
      holdersCount: 31n,
      transfersCount: 85n,
    });
    expect(parseCounters({ transfers_count: 85 })).toEqual({ holdersCount: null, transfersCount: 85n });
    expect(parseCounters({})).toEqual({ holdersCount: null, transfersCount: null });
    expect(parseCounters(undefined)).toBeNull();
  });

  it("parses holders, tags contracts and skips bad rows", () => {
    const parsed = parseHolders({
      items: [
        holder("0xE5AC80a69E9fA7f6428480b2300338eE5136044d", "567556913985091303130009127", false),
        holder("0x5f88Be4e52FF454eA40d69d212497B7C5D9b622b", "215280639802496754734929924", true),
        holder("0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559", "50494326532125825070632650", true, "VIBE MORNING"),
        { value: "12", address: { hash: "not-an-address" } },
        { value: "not a number", address: { hash: "0x55BffA63c2493de0022E88cfED40d98550DD411F" } },
        { address: {} },
        null,
        { value: "7", address: { hash: "0x55bffa63c2493de0022e88cfed40d98550dd411f" } },
      ],
    });
    expect(parsed).toEqual([
      { address: "0xE5AC80a69E9fA7f6428480b2300338eE5136044d", value: 567556913985091303130009127n, isContract: false, name: null },
      { address: "0x5f88Be4e52FF454eA40d69d212497B7C5D9b622b", value: 215280639802496754734929924n, isContract: true, name: null },
      { address: "0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559", value: 50494326532125825070632650n, isContract: true, name: "VIBE MORNING" },
      { address: "0x55BffA63c2493de0022E88cfED40d98550DD411F", value: 7n, isContract: false, name: null },
    ]);
  });

  it("limits the holder list and rejects a wrong shape", () => {
    const items = Array.from({ length: 30 }, (_, index) =>
      holder(`0x${(index + 1).toString(16).padStart(40, "0")}`, String(index + 1), false),
    );
    expect(parseHolders({ items }, 10)).toHaveLength(10);
    expect(parseHolders({ items: [] })).toEqual([]);
    expect(parseHolders({})).toBeNull();
    expect(parseHolders({ items: "nope" })).toBeNull();
  });
});
