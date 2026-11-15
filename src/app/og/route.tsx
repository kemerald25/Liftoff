import { ImageResponse } from "next/og";
import { CHAIN } from "@/config/chain";
import { PLATFORM } from "@/config/platform";
import { KIT, getSiteMode } from "@/config/site";
import { getTokenInfo } from "@/lib/explorer";
import { resolveAccent } from "@/lib/format";

/**
 * Open Graph image, built from text only: project name, symbol and look in
 * project mode, Liftoff's own card in kit mode. Both carry the required
 * unofficial label. No logos or artwork from anyone else are used.
 */
export const revalidate = 3600;

const COLOURS = { bg: "#0e1010", panel: "#191c1b", text: "#f1f4eb", muted: "#a0a99b", line: "#30352e" };

export async function GET() {
  const site = getSiteMode();
  const project = site.mode === "project" ? site.config : null;
  const accent = resolveAccent(project?.accent).dark?.accent ?? "#dff902";
  const symbol = project ? ((await getTokenInfo(project.token))?.symbol ?? null) : null;

  const title = project ? project.name : KIT.name;
  const tagline = project ? project.tagline : KIT.tagline;
  const eyebrow = project ? PLATFORM.categories[project.look] : "Unofficial launch kit";
  const label = project ? KIT.labels.projectShort : KIT.labels.kit;
  const titleSize = title.length > 22 ? 72 : title.length > 12 ? 92 : 116;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: COLOURS.bg,
        color: COLOURS.text,
        borderTop: `16px solid ${accent}`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 28, color: COLOURS.muted, letterSpacing: 3 }}>
          <div style={{ display: "flex", textTransform: "uppercase" }}>{eyebrow}</div>
          {symbol && (
            <div
              style={{
                display: "flex",
                marginLeft: 24,
                padding: "4px 16px",
                borderRadius: 8,
                border: `2px solid ${accent}`,
                color: accent,
              }}
            >
              {symbol.slice(0, 16)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: titleSize, fontWeight: 700, lineHeight: 1.05 }}>
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 36, color: COLOURS.text, lineHeight: 1.3 }}>
          {tagline.length > 110 ? `${tagline.slice(0, 107)}…` : tagline}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {project && (
          <div style={{ display: "flex", fontSize: 24, color: COLOURS.muted }}>
            {project.token} · {CHAIN.name}
          </div>
        )}
        <div
          style={{
            display: "flex",
            marginTop: 16,
            paddingTop: 16,
            borderTop: `2px solid ${COLOURS.line}`,
            fontSize: 22,
            color: COLOURS.muted,
          }}
        >
          {label}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
