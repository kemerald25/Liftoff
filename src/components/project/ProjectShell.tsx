import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CHAIN } from "@/config/chain";
import { KIT } from "@/config/site";
import type { SiteConfig } from "@/lib/config";

/** Frame for a builder's project site (project mode). */
export function ProjectShell({
  config,
  holderAreaEnabled,
  children,
}: {
  config: SiteConfig;
  holderAreaEnabled: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader
        brand={<span className="truncate">{config.name}</span>}
        links={[
          { href: "/", label: "Home" },
          ...(holderAreaEnabled ? [{ href: "/holders", label: "Holder area" }] : []),
        ]}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="mt-12 border-t border-line">
        <div className="wrap space-y-3 py-8 text-sm text-muted">
          <p className="text-text" data-testid="project-label">
            {KIT.labels.project}
          </p>
          <p>
            {KIT.labels.testnet} This token is on {CHAIN.name}. Nothing on this site is financial advice.
          </p>
          <p className="font-mono">
            <a href={KIT.repoUrl} target="_blank" rel="noopener noreferrer">
              Make your own site with {KIT.name}
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
