import { ImageResponse } from "next/og";
import { getSiteMode } from "@/config/site";
import { getTokenInfo } from "@/lib/explorer";
import { buildOgCard } from "@/lib/og";

/**
 * Open Graph image, built from text only: project name, symbol and look in
 * project mode, Liftoff's own card in kit mode. Both carry the required
 * unofficial label in full. No logos or artwork from anyone else are used.
 */
export const revalidate = 3600;

const COLOURS = { bg: "#0e1010", text: "#f1f4eb", body: "#ced3c8", muted: "#a0a99b", line: "#30352e" };

export async function GET() {
  const site = getSiteMode();
  const symbol = site.mode === "project" ? ((await getTokenInfo(site.config.token))?.symbol ?? null) : null;
  const card = buildOgCard(site, symbol);
  const titleSize = card.title.length > 22 ? 64 : card.title.length > 12 ? 80 : 104;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 52,
        background: COLOURS.bg,
        color: COLOURS.text,
        borderTop: `16px solid ${card.accent}`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 26, color: COLOURS.muted, letterSpacing: 3 }}>
          <div style={{ display: "flex", textTransform: "uppercase" }}>{card.eyebrow}</div>
          {card.symbol && (
            <div
              style={{
                display: "flex",
                marginLeft: 24,
                padding: "4px 16px",
                borderRadius: 8,
                border: `2px solid ${card.accent}`,
                color: card.accent,
              }}
            >
              {card.symbol}
            </div>
          )}
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: titleSize, fontWeight: 700, lineHeight: 1.05 }}>
          {card.title}
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 32, lineHeight: 1.3 }}>{card.tagline}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {card.addressLine && (
          <div style={{ display: "flex", fontSize: 22, color: COLOURS.muted }}>{card.addressLine}</div>
        )}
        <div
          style={{
            display: "flex",
            marginTop: 14,
            paddingTop: 14,
            borderTop: `2px solid ${COLOURS.line}`,
            fontSize: 24,
            lineHeight: 1.35,
            color: COLOURS.body,
          }}
        >
          {card.label}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
