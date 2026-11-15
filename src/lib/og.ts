import { CHAIN } from "@/config/chain";
import { PLATFORM } from "@/config/platform";
import { KIT, type SiteMode } from "@/config/site";
import { resolveAccent } from "@/lib/format";

/**
 * Text for the Open Graph image. Kept apart from the image route so tests
 * can check that the required unofficial label is always part of it.
 */
export type OgCard = {
  eyebrow: string;
  title: string;
  tagline: string;
  symbol: string | null;
  /** Project mode: contract address and network. Kit mode: the official site address. */
  addressLine: string | null;
  /** The required unofficial label, in full. */
  label: string;
  accent: string;
};

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function buildOgCard(site: SiteMode, symbol: string | null): OgCard {
  if (site.mode === "kit") {
    return {
      eyebrow: "Unofficial launch kit",
      title: KIT.name,
      tagline: clip(KIT.tagline, 100),
      symbol: null,
      addressLine: new URL(KIT.homeUrl).host,
      label: KIT.labels.kit,
      accent: "#dff902",
    };
  }
  const { config } = site;
  return {
    eyebrow: PLATFORM.categories[config.look],
    title: config.name,
    tagline: clip(config.tagline, 100),
    symbol: symbol ? clip(symbol, 16) : null,
    addressLine: `${config.token} · ${CHAIN.name}`,
    label: KIT.labels.project,
    accent: resolveAccent(config.accent).dark?.accent ?? "#dff902",
  };
}
