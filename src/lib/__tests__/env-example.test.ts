import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SAMPLE_CONFIG, SAMPLE_HOLDER_CONTENT } from "@/config/sample";
import { decodeConfig, decodeHolderContent, encodeConfig, encodeHolderContent } from "@/lib/config";

/**
 * Keeps `.env.example` in step with the sample config. To regenerate it
 * after changing the sample, run:  UPDATE_ENV_EXAMPLE=1 pnpm test
 */
const FILE = join(__dirname, "..", "..", "..", ".env.example");

function build(): string {
  const config = encodeConfig(SAMPLE_CONFIG);
  const holder = encodeHolderContent(SAMPLE_HOLDER_CONTENT);
  if (!config.ok || !holder.ok) throw new Error("sample does not encode");
  return [
    "# Liftoff has exactly two environment variables. Make your own values in the setup wizard (/setup).",
    "# The values below are a SAMPLE for local development. The token is an arbitrary testnet example,",
    "# not an endorsement. Copy this file to .env.local to see project mode; delete it to see kit mode.",
    "",
    "# Public site config (safe to share). Unset or invalid = kit mode.",
    `NEXT_PUBLIC_LIFTOFF_CONFIG=${config.value}`,
    "",
    "# Private holder content (optional, server only). Never prefix this with NEXT_PUBLIC_.",
    "# This sample value is public because it is in the repository. Use your own for a real site.",
    `LIFTOFF_HOLDER_CONTENT=${holder.value}`,
    "",
  ].join("\n");
}

describe(".env.example", () => {
  it("holds the encoded sample config and holder content", () => {
    if (process.env.UPDATE_ENV_EXAMPLE === "1") writeFileSync(FILE, build());
    const text = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
    expect(text).toBe(build());

    const value = (name: string) => new RegExp(`^${name}=(.+)$`, "m").exec(text)?.[1] ?? "";
    const config = decodeConfig(value("NEXT_PUBLIC_LIFTOFF_CONFIG"));
    expect(config.ok && config.value.token).toBe("0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559");
    expect(decodeHolderContent(value("LIFTOFF_HOLDER_CONTENT")).ok).toBe(true);
  });
});
