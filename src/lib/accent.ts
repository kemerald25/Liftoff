import { resolveAccent } from "@/lib/format";

const DEFAULT_LIGHT = "--accent:#426000;--accent-ink:#ffffff;";

/**
 * CSS that applies a builder's custom accent, only in the themes where it
 * passes AA contrast. `scope` limits it to part of the page (the wizard
 * preview). Safe to inline: only strict #rrggbb values get through.
 */
export function accentCss(accent: string | undefined, scope = ""): string {
  const resolved = resolveAccent(accent);
  const vars = (value: { accent: string; ink: string }) => `--accent:${value.accent};--accent-ink:${value.ink};`;
  const at = (root: string) => (scope ? `${root} ${scope}` : root);
  const light = (body: string) =>
    `@media (prefers-color-scheme: light){${at(':root:not([data-theme="dark"])')}{${body}}}${at(':root[data-theme="light"]')}{${body}}`;

  let css = "";
  if (resolved.dark) {
    css += `${at(":root")}{${vars(resolved.dark)}}`;
    // Where the custom colour fails in light theme, keep the default light accent.
    if (!resolved.light) css += light(DEFAULT_LIGHT);
  }
  if (resolved.light) css += light(vars(resolved.light));
  return css;
}
