import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deployUrl, isCanonicalKitHost, KIT, metadataBaseUrl, showSetupBanner } from "@/config/site";
import { contrastRatio, resolveAccent, THEME_SURFACES } from "@/lib/format";

/**
 * Reads the colour tokens straight out of globals.css and checks every text
 * and button colour pair the three looks can produce against WCAG AA (4.5:1).
 */

const css = readFileSync(join(__dirname, "..", "..", "app", "globals.css"), "utf8");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block for ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)].map((match) => [match[1], match[2]]));
}

const themes = {
  dark: tokens(":root"),
  light: tokens(':root[data-theme="light"]'),
  lightSystem: tokens(':root:not([data-theme="dark"])'),
};

const SURFACES = ["bg", "surface", "panel", "soft"] as const;
const TEXT_COLOURS = ["text", "body", "muted", "accent", "warn", "danger"] as const;

describe("theme contrast (WCAG AA)", () => {
  it("finds every token in both themes, and the two light blocks agree", () => {
    for (const theme of [themes.dark, themes.light]) {
      for (const name of [...SURFACES, ...TEXT_COLOURS, "accent-ink", "line"]) {
        expect(theme[name], name).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
    expect(themes.lightSystem).toEqual(themes.light);
  });

  for (const name of ["dark", "light"] as const) {
    it(`${name} theme: every text colour reaches 4.5:1 on every surface`, () => {
      const theme = themes[name];
      for (const colour of TEXT_COLOURS) {
        for (const surface of SURFACES) {
          const ratio = contrastRatio(theme[colour] as string, theme[surface] as string);
          expect(ratio, `${colour} on ${surface} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`${name} theme: primary button text reaches 4.5:1 on the accent fill`, () => {
      const theme = themes[name];
      expect(contrastRatio(theme["accent-ink"] as string, theme.accent as string)).toBeGreaterThanOrEqual(4.5);
    });

    it(`${name} theme: the surfaces used for custom accents match the stylesheet`, () => {
      expect([...THEME_SURFACES[name]]).toEqual(SURFACES.map((surface) => themes[name][surface]));
    });
  }

  it("does not dim placeholder text below the muted colour", () => {
    const placeholder = css.slice(css.indexOf(".input::placeholder"), css.indexOf("}", css.indexOf(".input::placeholder")));
    expect(placeholder).toContain("color: var(--muted)");
    expect(placeholder).toContain("opacity: 1");
  });

  it("accepts a custom accent only where it passes on every surface of that theme", () => {
    for (const accent of ["#dff902", "#426000", "#ff5500", "#0057b8", "#777777", "#6b7d00", "#c2185b"]) {
      const resolved = resolveAccent(accent);
      for (const name of ["dark", "light"] as const) {
        const passes = THEME_SURFACES[name].every((surface) => contrastRatio(accent, surface) >= 4.5);
        if (resolved[name]) {
          expect(passes, `${accent} used in ${name}`).toBe(true);
          expect(contrastRatio(resolved[name].ink, accent)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
    // Passes on white (4.5:1 needed) but not on the tinted "soft" surface, so it is not used.
    const borderline = "#757575";
    expect(contrastRatio(borderline, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(resolveAccent(borderline).light).toBeNull();
  });
});

describe("Finish setup banner", () => {
  const officialHost = new URL(KIT.homeUrl).host;

  it("is hidden on the official hosted copy", () => {
    expect(isCanonicalKitHost(officialHost)).toBe(true);
    expect(isCanonicalKitHost(officialHost.toUpperCase())).toBe(true);
    expect(showSetupBanner(officialHost, null)).toBe(false);
  });

  it("is shown on every other unconfigured deployment", () => {
    for (const host of ["my-liftoff-site.vercel.app", "localhost:3000", `evil-${officialHost}`, `${officialHost}.evil.example`, "", null, undefined]) {
      expect(isCanonicalKitHost(host), String(host)).toBe(false);
      expect(showSetupBanner(host, null), String(host)).toBe(true);
    }
  });

  it("is shown anywhere a config was set but could not be read", () => {
    expect(showSetupBanner(officialHost, "The site config could not be read.")).toBe(true);
  });

  it("uses the official https home address, with no trailing slash", () => {
    expect(KIT.homeUrl).toBe("https://liftoff-vibe.vercel.app");
    expect(officialHost).toBe("liftoff-vibe.vercel.app");
  });
});

describe("site address", () => {
  it("is the metadata base in kit mode when not on Vercel", () => {
    expect(metadataBaseUrl("kit", undefined).href).toBe("https://liftoff-vibe.vercel.app/");
    expect(metadataBaseUrl("kit", "").href).toBe("https://liftoff-vibe.vercel.app/");
  });

  it("gives each deployment its own metadata base on Vercel", () => {
    expect(metadataBaseUrl("kit", "liftoff-vibe.vercel.app").href).toBe(KIT.homeUrl + "/");
    expect(metadataBaseUrl("kit", "someone-else.vercel.app").host).toBe("someone-else.vercel.app");
    expect(metadataBaseUrl("project", "my-token.example").href).toBe("https://my-token.example/");
    // A builder's project site never points its metadata at Liftoff's address.
    expect(metadataBaseUrl("project", undefined).host).toBe("localhost:3000");
  });

  it("is where the Deploy Button sends builders for help, while the repository is what gets cloned", () => {
    for (const withHolderContent of [false, true]) {
      const params = new URL(deployUrl({ withHolderContent })).searchParams;
      expect(params.get("envLink")).toBe("https://liftoff-vibe.vercel.app/setup");
      expect(params.get("repository-url")).toBe(KIT.repoUrl);
    }
  });
});
