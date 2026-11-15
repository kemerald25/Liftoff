import { describe, expect, it } from "vitest";
import { SAMPLE_CONFIG, SAMPLE_HOLDER_CONTENT } from "@/config/sample";
import {
  MAX_CONFIG_CHARS,
  MAX_HOLDER_CHARS,
  decodeConfig,
  decodeHolderContent,
  encodeConfig,
  encodeHolderContent,
  fromBase64Url,
  migrateConfig,
  migrateHolderContent,
  toBase64Url,
  validateConfig,
} from "@/lib/config";

const TOKEN = "0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559";
const minimal = { v: 1, token: TOKEN, look: "meme", name: "Test", tagline: "A tagline", description: "Hello" };

function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

describe("site config", () => {
  it("round-trips through encode and decode", () => {
    const encoded = expectOk(encodeConfig(SAMPLE_CONFIG));
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    const decoded = expectOk(decodeConfig(encoded));
    expect(decoded).toEqual(expectOk(validateConfig(SAMPLE_CONFIG)));
    // Encoding the decoded value again gives the identical string.
    expect(expectOk(encodeConfig(decoded))).toBe(encoded);
  });

  it("keeps non-ASCII text intact", () => {
    const encoded = expectOk(encodeConfig({ ...minimal, name: "Café 🚀", tagline: "日本語 ok" }));
    const decoded = expectOk(decodeConfig(encoded));
    expect(decoded.name).toBe("Café 🚀");
    expect(decoded.tagline).toBe("日本語 ok");
  });

  it("normalises a lowercase address to its checksum form", () => {
    const decoded = expectOk(validateConfig({ ...minimal, token: TOKEN.toLowerCase() }));
    expect(decoded.token).toBe(TOKEN);
  });

  it("rejects bad addresses", () => {
    for (const token of [
      "",
      "0x123",
      "not-an-address",
      TOKEN.slice(0, -1),
      `${TOKEN}0`,
      // Valid length but a broken checksum (one letter's case flipped).
      "0xEC6Eb722A645Eb91116d824F9D68801Bb5ede559",
    ]) {
      const result = validateConfig({ ...minimal, token });
      expect(result.ok, token).toBe(false);
    }
  });

  it("rejects links that are not https", () => {
    for (const website of [
      "http://example.com",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "ftp://example.com",
      "//example.com",
      "example.com",
      "https://user:pass@example.com",
      "https://exa mple.com",
    ]) {
      expect(validateConfig({ ...minimal, links: { website } }).ok, website).toBe(false);
    }
    expect(validateConfig({ ...minimal, imageUrl: "http://example.com/a.png" }).ok).toBe(false);
    expect(validateConfig({ ...minimal, links: { website: "https://example.com/path?q=1" } }).ok).toBe(true);
  });

  it("rejects text over the length caps and too many items", () => {
    expect(validateConfig({ ...minimal, name: "x".repeat(41) }).ok).toBe(false);
    expect(validateConfig({ ...minimal, description: "x".repeat(2001) }).ok).toBe(false);
    const items = Array.from({ length: 7 }, (_, index) => ({ title: `Item ${index}` }));
    expect(validateConfig({ ...minimal, sections: [{ type: "features", title: "F", items }] }).ok).toBe(false);
    const faq = Array.from({ length: 9 }, (_, index) => ({ q: `Q${index}`, a: "A" }));
    expect(validateConfig({ ...minimal, sections: [{ type: "faq", items: faq }] }).ok).toBe(false);
  });

  it("rejects an invalid gate threshold or accent", () => {
    const gate = { title: "Holders", teaser: "Teaser" };
    for (const minTokens of ["0", "-5", "1.5", "abc", "1000000001", ""]) {
      expect(validateConfig({ ...minimal, gate: { ...gate, minTokens } }).ok, minTokens).toBe(false);
    }
    expect(validateConfig({ ...minimal, gate: { ...gate, minTokens: "1000000000" } }).ok).toBe(true);
    expect(validateConfig({ ...minimal, accent: "red" }).ok).toBe(false);
    expect(validateConfig({ ...minimal, accent: "#FFAA00" }).ok).toBe(true);
  });

  it("rejects an oversize encoded string with a clear message", () => {
    const result = decodeConfig("A".repeat(MAX_CONFIG_CHARS + 1));
    expect(result).toEqual({ ok: false, error: expect.stringContaining("too large") });
  });

  it("rejects garbage, wrong JSON and unknown looks", () => {
    expect(decodeConfig("").ok).toBe(false);
    expect(decodeConfig("!!!not base64!!!").ok).toBe(false);
    expect(decodeConfig(toBase64Url("not json")).ok).toBe(false);
    expect(decodeConfig(toBase64Url(JSON.stringify([1, 2]))).ok).toBe(false);
    expect(decodeConfig(toBase64Url(JSON.stringify({ ...minimal, look: "casino" }))).ok).toBe(false);
  });

  it("drops unknown keys instead of carrying them through", () => {
    const decoded = expectOk(validateConfig({ ...minimal, evil: "<script>" }));
    expect(decoded).not.toHaveProperty("evil");
  });
});

describe("migrateConfig", () => {
  it("passes a current-version config through unchanged", () => {
    expect(migrateConfig(minimal)).toEqual(minimal);
    const encoded = expectOk(encodeConfig(minimal));
    expect(expectOk(decodeConfig(encoded))).toMatchObject({ v: 1, name: "Test" });
  });

  it("refuses versions from the future and missing versions", () => {
    expect(() => migrateConfig({ ...minimal, v: 2 })).toThrow(/newer version/);
    expect(() => migrateConfig({ ...minimal, v: undefined })).toThrow();
    expect(() => migrateConfig("nope")).toThrow();
    const future = decodeConfig(toBase64Url(JSON.stringify({ ...minimal, v: 99 })));
    expect(future).toEqual({ ok: false, error: expect.stringContaining("newer version") });
  });
});

describe("holder content", () => {
  it("round-trips through encode and decode", () => {
    const encoded = expectOk(encodeHolderContent(SAMPLE_HOLDER_CONTENT));
    const decoded = expectOk(decodeHolderContent(encoded));
    expect(decoded.body).toBe(SAMPLE_HOLDER_CONTENT.body);
    expect(decoded.links).toEqual(SAMPLE_HOLDER_CONTENT.links);
    expect(expectOk(encodeHolderContent(decoded))).toBe(encoded);
  });

  it("rejects non-https links, too many links, oversize and future versions", () => {
    expect(encodeHolderContent({ v: 1, body: "x", links: [{ label: "a", url: "http://a.com" }] }).ok).toBe(false);
    const links = Array.from({ length: 9 }, () => ({ label: "a", url: "https://a.com" }));
    expect(encodeHolderContent({ v: 1, body: "x", links }).ok).toBe(false);
    expect(encodeHolderContent({ v: 1, body: "x".repeat(4001) }).ok).toBe(false);
    expect(decodeHolderContent("A".repeat(MAX_HOLDER_CHARS + 1)).ok).toBe(false);
    expect(() => migrateHolderContent({ v: 2, body: "x" })).toThrow(/newer version/);
    expect(migrateHolderContent({ v: 1, body: "x" })).toEqual({ v: 1, body: "x" });
  });
});

describe("base64url", () => {
  it("round-trips and rejects other alphabets", () => {
    expect(fromBase64Url(toBase64Url("héllo wörld ✓"))).toBe("héllo wörld ✓");
    expect(() => fromBase64Url("a+b/c=")).toThrow();
  });
});
