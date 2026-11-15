import { LINK_KEYS, type HolderContent, type LinkKey, type SiteConfig } from "@/lib/config";
import type { Look } from "@/config/platform";

/**
 * The wizard's working copy. Unlike a finished config, a draft may be
 * incomplete or invalid at any moment; it is converted and validated with
 * the real schema every time it changes.
 */

export type DraftItem = { title: string; text: string };
export type DraftFaq = { q: string; a: string };

export type DraftSection =
  | { type: "about"; title: string; body: string }
  | { type: "features"; title: string; items: DraftItem[] }
  | { type: "roadmap"; title: string; items: DraftItem[] }
  | { type: "faq"; title: string; items: DraftFaq[] };

export type Draft = {
  token: string;
  look: Look;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  accent: string;
  links: Record<LinkKey, string>;
  sections: DraftSection[];
  gateEnabled: boolean;
  gate: { minTokens: string; title: string; teaser: string };
};

export type HolderDraft = { body: string; links: { label: string; url: string }[] };

export const EMPTY_DRAFT: Draft = {
  token: "",
  look: "meme",
  name: "",
  tagline: "",
  description: "",
  imageUrl: "",
  accent: "",
  links: { website: "", demo: "", repo: "", x: "", telegram: "", discord: "" },
  sections: [],
  gateEnabled: false,
  gate: { minTokens: "1000", title: "Holder area", teaser: "" },
};

export const EMPTY_HOLDER_DRAFT: HolderDraft = { body: "", links: [] };

export function newSection(type: DraftSection["type"]): DraftSection {
  switch (type) {
    case "about":
      return { type, title: "", body: "" };
    case "features":
      return { type, title: "Features", items: [{ title: "", text: "" }] };
    case "roadmap":
      return { type, title: "", items: [{ title: "", text: "" }] };
    case "faq":
      return { type, title: "", items: [{ q: "", a: "" }] };
  }
}

const filled = (value: string) => value.trim() !== "";
const optional = (value: string) => (filled(value) ? value : undefined);

/** Builds the object that the config schema validates. Empty optional fields are left out. */
export function draftToConfigInput(draft: Draft): unknown {
  const links = Object.fromEntries(LINK_KEYS.flatMap((key) => (filled(draft.links[key]) ? [[key, draft.links[key]]] : [])));
  const sections = draft.sections.map((section) => {
    if (section.type === "about") {
      return { type: section.type, title: optional(section.title), body: section.body };
    }
    if (section.type === "faq") {
      return {
        type: section.type,
        title: optional(section.title),
        items: section.items.filter((item) => filled(item.q) || filled(item.a)),
      };
    }
    return {
      type: section.type,
      title: section.type === "features" ? section.title : optional(section.title),
      items: section.items
        .filter((item) => filled(item.title) || filled(item.text))
        .map((item) => ({ title: item.title, text: optional(item.text) })),
    };
  });
  return {
    v: 1,
    token: draft.token,
    look: draft.look,
    name: draft.name,
    tagline: draft.tagline,
    description: draft.description,
    imageUrl: optional(draft.imageUrl),
    links: Object.keys(links).length > 0 ? links : undefined,
    sections: sections.length > 0 ? sections : undefined,
    gate: draft.gateEnabled ? draft.gate : undefined,
    accent: optional(draft.accent),
  };
}

export function holderDraftToInput(draft: HolderDraft): unknown {
  const links = draft.links.filter((link) => filled(link.label) || filled(link.url));
  return { v: 1, body: draft.body, links: links.length > 0 ? links : undefined };
}

export function configToDraft(config: SiteConfig): Draft {
  return {
    token: config.token,
    look: config.look,
    name: config.name,
    tagline: config.tagline,
    description: config.description,
    imageUrl: config.imageUrl ?? "",
    accent: config.accent ?? "",
    links: { ...EMPTY_DRAFT.links, ...config.links },
    sections: (config.sections ?? []).map((section): DraftSection => {
      if (section.type === "about") return { type: "about", title: section.title ?? "", body: section.body };
      if (section.type === "faq") {
        return { type: "faq", title: section.title ?? "", items: section.items.map((item) => ({ ...item })) };
      }
      return {
        type: section.type,
        title: section.title ?? "",
        items: section.items.map((item) => ({ title: item.title, text: item.text ?? "" })),
      };
    }),
    gateEnabled: config.gate !== undefined,
    gate: config.gate ? { ...config.gate } : { ...EMPTY_DRAFT.gate },
  };
}

export function holderToDraft(content: HolderContent): HolderDraft {
  return { body: content.body, links: (content.links ?? []).map((link) => ({ ...link })) };
}

/** Restores a draft saved in the URL hash, tolerating anything unexpected. */
export function reviveDraft(raw: unknown): Draft {
  if (typeof raw !== "object" || raw === null) return EMPTY_DRAFT;
  const source = raw as Partial<Draft>;
  const text = (value: unknown, fallback = "") => (typeof value === "string" ? value.slice(0, 5000) : fallback);
  const look = source.look === "product" || source.look === "rwa" ? source.look : "meme";
  const links = { ...EMPTY_DRAFT.links };
  for (const key of LINK_KEYS) links[key] = text((source.links as Record<string, unknown> | undefined)?.[key]);
  const sections: DraftSection[] = [];
  for (const candidate of Array.isArray(source.sections) ? source.sections.slice(0, 6) : []) {
    const section = candidate as Partial<DraftSection> & { items?: unknown; body?: unknown };
    const items = Array.isArray(section.items) ? (section.items as Record<string, unknown>[]).slice(0, 8) : [];
    if (section.type === "about") {
      sections.push({ type: "about", title: text(section.title), body: text(section.body) });
    } else if (section.type === "faq") {
      sections.push({
        type: "faq",
        title: text(section.title),
        items: items.map((item) => ({ q: text(item?.q), a: text(item?.a) })),
      });
    } else if (section.type === "features" || section.type === "roadmap") {
      sections.push({
        type: section.type,
        title: text(section.title),
        items: items.map((item) => ({ title: text(item?.title), text: text(item?.text) })),
      });
    }
  }
  const gate = (source.gate ?? {}) as Partial<Draft["gate"]>;
  return {
    token: text(source.token),
    look,
    name: text(source.name),
    tagline: text(source.tagline),
    description: text(source.description),
    imageUrl: text(source.imageUrl),
    accent: text(source.accent),
    links,
    sections,
    gateEnabled: source.gateEnabled === true,
    gate: {
      minTokens: text(gate.minTokens, EMPTY_DRAFT.gate.minTokens),
      title: text(gate.title, EMPTY_DRAFT.gate.title),
      teaser: text(gate.teaser),
    },
  };
}

export function reviveHolderDraft(raw: unknown): HolderDraft {
  if (typeof raw !== "object" || raw === null) return EMPTY_HOLDER_DRAFT;
  const source = raw as { body?: unknown; links?: unknown };
  const links = Array.isArray(source.links) ? (source.links as Record<string, unknown>[]).slice(0, 8) : [];
  return {
    body: typeof source.body === "string" ? source.body.slice(0, 5000) : "",
    links: links.map((link) => ({
      label: typeof link?.label === "string" ? link.label.slice(0, 200) : "",
      url: typeof link?.url === "string" ? link.url.slice(0, 400) : "",
    })),
  };
}
