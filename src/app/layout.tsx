import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { themeInitScript } from "@/components/ThemeToggle";
import { KIT, getSiteMode, metadataBaseUrl } from "@/config/site";
import { getTokenInfo } from "@/lib/explorer";
import { accentCss } from "@/lib/accent";
import "./globals.css";

const bodyFont = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const headingFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-heading", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteMode();
  const base = { metadataBase: metadataBaseUrl(site.mode, process.env.VERCEL_PROJECT_PRODUCTION_URL), openGraph: { images: ["/og"] }, twitter: { card: "summary_large_image" as const } };
  if (site.mode === "kit") {
    return {
      ...base,
      title: { default: `${KIT.name}: project sites for vibe/vibe builders (unofficial)`, template: `%s · ${KIT.name}` },
      description: `${KIT.tagline} ${KIT.labels.kit}`,
    };
  }
  const info = await getTokenInfo(site.config.token);
  const symbol = info?.symbol ? ` (${info.symbol})` : "";
  return {
    ...base,
    title: { default: `${site.config.name}${symbol}`, template: `%s · ${site.config.name}` },
    description: `${site.config.tagline} Token contract ${site.config.token} on Robinhood Chain Testnet.`,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e1010" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const site = getSiteMode();
  // Safe to inline: accentCss only passes through strict #rrggbb values.
  const css = site.mode === "project" ? accentCss(site.config.accent) : "";
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
