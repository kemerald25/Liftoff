import { isHttpsUrl } from "@/lib/config";

/**
 * A deliberately small Markdown parser for untrusted text.
 *
 * It produces a plain data tree that <Markdown> turns into React elements,
 * so no HTML string is ever injected into the page. Raw HTML in the source
 * is removed before parsing. Supported: paragraphs, headings, bold, italic,
 * inline code, https links, bullet and numbered lists, and quotes.
 */

export type Inline =
  | { type: "text"; value: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: Inline[] }
  | { type: "break" };

export type Block =
  | { type: "heading"; level: 3 | 4; children: Inline[] }
  | { type: "paragraph"; children: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "quote"; children: Inline[] };

/** Removes script/style blocks, comments and every HTML tag. */
export function stripHtml(source: string): string {
  let text = source.replace(/\r\n?/g, "\n");
  let previous: string;
  do {
    previous = text;
    text = text
      .replace(/<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\/?[a-zA-Z][^>]*>/g, "")
      .replace(/<\/?[a-zA-Z][^>\n]*$/gm, "");
  } while (text !== previous);
  return text;
}

const INLINE =
  /(`[^`\n]+`)|(\*\*(?=\S)([\s\S]+?)\*\*)|(\*(?=\S)([^*\n]+?)\*)|(\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\))/g;

export function parseInline(text: string, depth = 0): Inline[] {
  if (depth > 4) return [{ type: "text", value: text }];
  const nodes: Inline[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push({ type: "text", value: text.slice(cursor, index) });
    if (match[1]) {
      nodes.push({ type: "code", value: match[1].slice(1, -1) });
    } else if (match[2]) {
      nodes.push({ type: "strong", children: parseInline(match[3] ?? "", depth + 1) });
    } else if (match[4]) {
      nodes.push({ type: "em", children: parseInline(match[5] ?? "", depth + 1) });
    } else if (match[6]) {
      const label = parseInline(match[7] ?? "", depth + 1);
      const href = match[8] ?? "";
      // Only https links become links. Anything else stays as plain text.
      if (isHttpsUrl(href)) nodes.push({ type: "link", href, children: label });
      else nodes.push(...label);
    }
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push({ type: "text", value: text.slice(cursor) });
  return nodes;
}

function inlineLines(lines: string[]): Inline[] {
  const nodes: Inline[] = [];
  lines.forEach((line, index) => {
    if (index > 0) nodes.push({ type: "break" });
    nodes.push(...parseInline(line));
  });
  return nodes;
}

const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d{1,3}[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/;
const QUOTE = /^\s*>\s?(.*)$/;

export function parseMarkdown(source: string, maxBlocks = 200): Block[] {
  const lines = stripHtml(source).split("\n");
  const blocks: Block[] = [];
  let index = 0;

  const take = (pattern: RegExp): string[] => {
    const taken: string[] = [];
    while (index < lines.length) {
      const match = pattern.exec(lines[index] ?? "");
      if (!match) break;
      taken.push(match[1] ?? "");
      index += 1;
    }
    return taken;
  };

  while (index < lines.length && blocks.length < maxBlocks) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: (heading[1] ?? "").length <= 2 ? 3 : 4,
        children: parseInline(heading[2] ?? ""),
      });
      index += 1;
    } else if (BULLET.test(line)) {
      blocks.push({ type: "list", ordered: false, items: take(BULLET).map((item) => parseInline(item)) });
    } else if (NUMBERED.test(line)) {
      blocks.push({ type: "list", ordered: true, items: take(NUMBERED).map((item) => parseInline(item)) });
    } else if (QUOTE.test(line)) {
      blocks.push({ type: "quote", children: inlineLines(take(QUOTE)) });
    } else {
      const paragraph: string[] = [];
      while (index < lines.length) {
        const next = lines[index] ?? "";
        if (
          next.trim() === "" ||
          HEADING.test(next) ||
          BULLET.test(next) ||
          NUMBERED.test(next) ||
          QUOTE.test(next)
        ) {
          break;
        }
        paragraph.push(next.trim());
        index += 1;
      }
      blocks.push({ type: "paragraph", children: inlineLines(paragraph) });
    }
  }
  return blocks;
}
