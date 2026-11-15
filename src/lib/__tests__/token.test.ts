import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  formatAgo,
  formatCount,
  formatTokenAmount,
  percentOfSupply,
  resolveAccent,
  shortAddress,
} from "@/lib/format";
import { meetsThreshold, thresholdInBaseUnits } from "@/lib/token";

const ONE = 10n ** 18n;

describe("balance threshold (bigint)", () => {
  it("converts whole tokens to base units", () => {
    expect(thresholdInBaseUnits("1000", 18)).toBe(1000n * ONE);
    expect(thresholdInBaseUnits("1", 0)).toBe(1n);
    expect(thresholdInBaseUnits("1000000000", 18)).toBe(10n ** 27n);
  });

  it("passes exactly at the limit", () => {
    expect(meetsThreshold(1000n * ONE, "1000", 18)).toBe(true);
  });

  it("fails one base unit below the limit", () => {
    expect(meetsThreshold(1000n * ONE - 1n, "1000", 18)).toBe(false);
    expect(meetsThreshold(0n, "1", 18)).toBe(false);
  });

  it("passes above the limit, including values beyond floating-point precision", () => {
    expect(meetsThreshold(1000n * ONE + 1n, "1000", 18)).toBe(true);
    // 2^53 + 1 cannot be told apart from 2^53 by a floating-point number.
    const big = 9007199254740993n;
    expect(meetsThreshold(big, "9007199254740993", 0)).toBe(true);
    expect(meetsThreshold(big - 1n, "9007199254740993", 0)).toBe(false);
  });

  it("rejects malformed thresholds", () => {
    expect(() => thresholdInBaseUnits("1.5", 18)).toThrow();
    expect(() => thresholdInBaseUnits("-1", 18)).toThrow();
    expect(() => thresholdInBaseUnits("10", 1000)).toThrow();
  });
});

describe("formatting without floating point", () => {
  it("formats token amounts", () => {
    expect(formatTokenAmount(10n ** 27n, 18, 0)).toBe("1,000,000,000");
    expect(formatTokenAmount(1234500000000000000000n, 18)).toBe("1,234.5");
    expect(formatTokenAmount(567556913985091303130009127n, 18, 0)).toBe("567,556,913");
    expect(formatTokenAmount(1n, 18)).toBe("0");
    expect(formatTokenAmount(0n, 18)).toBe("0");
    expect(formatTokenAmount(1999n, 3, 2)).toBe("1.99");
  });

  it("formats counts and percentages", () => {
    expect(formatCount("1234567")).toBe("1,234,567");
    expect(formatCount(31n)).toBe("31");
    expect(formatCount("abc")).toBe("0");
    expect(percentOfSupply(567556913985091303130009127n, 10n ** 27n)).toBe("56.75%");
    expect(percentOfSupply(10n ** 27n, 10n ** 27n)).toBe("100.00%");
    expect(percentOfSupply(1n, 10n ** 27n)).toBe("<0.01%");
    expect(percentOfSupply(5n, 0n)).toBe("0%");
  });

  it("shortens addresses and describes ages", () => {
    expect(shortAddress("0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559")).toBe("0xeC6E…e559");
    expect(formatAgo(0)).toBe("just now");
    expect(formatAgo(42)).toBe("42 seconds ago");
    expect(formatAgo(600)).toBe("10 minutes ago");
  });
});

describe("accent contrast", () => {
  it("computes WCAG contrast ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#dff902", "#0e1010")).toBeGreaterThan(4.5);
    expect(contrastRatio("#426000", "#ffffff")).toBeGreaterThan(4.5);
  });

  it("uses an accent only in themes where it passes AA", () => {
    expect(resolveAccent("#dff902")).toEqual({ dark: { accent: "#dff902", ink: "#0e1010" }, light: null });
    expect(resolveAccent("#426000").light).toEqual({ accent: "#426000", ink: "#ffffff" });
    expect(resolveAccent("#426000").dark).toBeNull();
    expect(resolveAccent("#777777")).toEqual({ dark: null, light: null });
    expect(resolveAccent("red; } body { display:none")).toEqual({ dark: null, light: null });
    expect(resolveAccent(undefined)).toEqual({ dark: null, light: null });
  });
});
