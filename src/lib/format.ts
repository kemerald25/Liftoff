/**
 * Display helpers. Token amounts are always bigint; nothing in this file
 * converts a balance to a floating-point number.
 */

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Formats a base-unit amount as a decimal string, e.g.
 * formatTokenAmount(1234500000000000000000n, 18) === "1,234.5".
 * Extra fraction digits are cut off (rounded down), never rounded up.
 */
export function formatTokenAmount(value: bigint, decimals: number, maxFractionDigits = 2): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = absolute / base;
  let fraction = (absolute % base).toString().padStart(decimals, "0").slice(0, maxFractionDigits);
  fraction = fraction.replace(/0+$/, "");
  const text = groupThousands(whole.toString()) + (fraction ? `.${fraction}` : "");
  return negative ? `-${text}` : text;
}

/** Formats a whole number held in a string or bigint with thousands separators. */
export function formatCount(value: bigint | string | number): string {
  const digits = typeof value === "string" ? value : value.toString();
  if (!/^\d+$/.test(digits)) return "0";
  return groupThousands(digits.replace(/^0+(?=\d)/, ""));
}

/** Share of supply as a percentage with two decimals, using integer maths only. */
export function percentOfSupply(value: bigint, totalSupply: bigint): string {
  if (totalSupply <= 0n || value < 0n) return "0%";
  const hundredths = (value * 10_000n) / totalSupply;
  if (hundredths === 0n && value > 0n) return "<0.01%";
  const whole = hundredths / 100n;
  const fraction = (hundredths % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}%`;
}

export function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** "just now", "12 seconds ago", "3 minutes ago". */
export function formatAgo(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 2) return "just now";
  if (safe < 90) return `${safe} seconds ago`;
  const minutes = Math.floor(safe / 60);
  if (minutes < 90) return `${minutes} minutes ago`;
  return `${Math.floor(minutes / 60)} hours ago`;
}

/* ---------- colour contrast (WCAG 2.x) ---------- */

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return 0;
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => parseInt(part as string, 16)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

export const THEME_BACKGROUNDS = { dark: "#0e1010", light: "#ffffff" } as const;

export type AccentResult = {
  /** Accent to use in each theme, or null when the colour fails AA contrast there. */
  dark: { accent: string; ink: string } | null;
  light: { accent: string; ink: string } | null;
};

/**
 * A custom accent is used as text on the page background and as a button
 * fill, so it must reach 4.5:1 against the background of a theme to be used
 * in that theme. Where it fails, the default accent stays.
 */
export function resolveAccent(hex: string | undefined): AccentResult {
  const none: AccentResult = { dark: null, light: null };
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return none;
  const accent = hex.toLowerCase();
  const ink = contrastRatio(accent, "#000000") >= contrastRatio(accent, "#ffffff") ? "#0e1010" : "#ffffff";
  const inkPasses = contrastRatio(accent, ink) >= 4.5;
  const usable = (background: string) =>
    inkPasses && contrastRatio(accent, background) >= 4.5 ? { accent, ink } : null;
  return { dark: usable(THEME_BACKGROUNDS.dark), light: usable(THEME_BACKGROUNDS.light) };
}
