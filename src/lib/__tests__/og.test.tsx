import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeConfig } from "@/lib/config";

/**
 * Checks that the required unofficial label reaches the Open Graph image.
 * `next/og` is replaced with a recorder, so the test sees exactly the
 * element tree the image route hands over to be drawn.
 */

const KIT_LABEL = "Unofficial community tool. Not affiliated with or endorsed by vibe/vibe.";
const PROJECT_LABEL =
  "Made with Liftoff, an unofficial community kit. This site is run by the project's creator, who is solely responsible for its content. Not affiliated with or endorsed by vibe/vibe or Liftoff.";
const TOKEN = "0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559";

const drawn: { element: ReactElement; options: unknown }[] = [];

vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: ReactElement, options: unknown) {
      drawn.push({ element, options });
    }
  },
}));

vi.mock("@/lib/explorer", () => ({
  getTokenInfo: async () => ({ symbol: "VIBEMORNING" }),
}));

/** Every piece of text in an element tree, in order. */
function texts(node: ReactNode): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(texts);
  return texts((node as ReactElement<{ children?: ReactNode }>).props?.children);
}

async function renderOg(config: string | undefined): Promise<string[]> {
  vi.resetModules();
  drawn.length = 0;
  if (config === undefined) delete process.env.NEXT_PUBLIC_LIFTOFF_CONFIG;
  else process.env.NEXT_PUBLIC_LIFTOFF_CONFIG = config;
  const route = await import("@/app/og/route");
  await route.GET();
  expect(drawn).toHaveLength(1);
  expect(drawn[0]?.options).toEqual({ width: 1200, height: 630 });
  return texts(drawn[0]?.element);
}

describe("Open Graph image", () => {
  const original = process.env.NEXT_PUBLIC_LIFTOFF_CONFIG;
  beforeEach(() => {
    drawn.length = 0;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LIFTOFF_CONFIG;
    else process.env.NEXT_PUBLIC_LIFTOFF_CONFIG = original;
  });

  it("kit mode passes the full unofficial label to the image", async () => {
    const text = await renderOg(undefined);
    expect(text).toContain(KIT_LABEL);
    expect(text).toContain("Liftoff");
    expect(text).toContain("liftoff-vibe.vercel.app");
    expect(text).not.toContain(PROJECT_LABEL);
  });

  it("project mode passes the full project label, name, symbol and address to the image", async () => {
    const encoded = encodeConfig({
      v: 1,
      token: TOKEN,
      look: "rwa",
      name: "Morning Tools",
      tagline: "A tiny toolkit for early risers.",
      description: "Test",
    });
    if (!encoded.ok) throw new Error(encoded.error);
    const text = await renderOg(encoded.value);
    expect(text).toContain(PROJECT_LABEL);
    expect(text).toContain("Morning Tools");
    expect(text).toContain("VIBEMORNING");
    expect(text).toContain("RWA & Stocks");
    expect(text.join(" ")).toContain(TOKEN);
    expect(text).not.toContain(KIT_LABEL);
  });

  it("an unreadable config falls back to the kit image and label", async () => {
    const text = await renderOg("not-a-config");
    expect(text).toContain(KIT_LABEL);
  });

  it("builds the card text for each mode", async () => {
    const { buildOgCard } = await import("@/lib/og");
    expect(buildOgCard({ mode: "kit", configError: null }, null).label).toBe(KIT_LABEL);
    const long = buildOgCard(
      {
        mode: "project",
        config: { v: 1, token: TOKEN, look: "meme", name: "N", tagline: "t".repeat(120), description: "d" },
      },
      "S".repeat(40),
    );
    expect(long.label).toBe(PROJECT_LABEL);
    expect(long.tagline).toHaveLength(100);
    expect(long.symbol).toHaveLength(16);
    expect(long.eyebrow).toBe("Meme & Artcoins");
  });
});
