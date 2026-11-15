import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { PLATFORM } from "@/config/platform";
import { CONFIG_ENV_NAME, KIT, showSetupBanner } from "@/config/site";

/** Frame for Liftoff's own pages (kit mode). */
export function KitShell({ children, configError }: { children: ReactNode; configError: string | null }) {
  return (
    <>
      <p className="border-b border-line bg-surface px-4 py-1.5 text-center font-mono text-xs text-muted">
        {KIT.labels.kit}
      </p>
      <SiteHeader
        brand={
          <>
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded bg-accent text-accent-ink">
              ↑
            </span>
            {KIT.name}
          </>
        }
        links={[
          { href: "/setup", label: "Setup" },
          { href: "/guide", label: "Guide" },
          { href: "/showcase", label: "Showcase" },
        ]}
      />
      <SetupBanner configError={configError} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="mt-12 border-t border-line">
        <div className="wrap space-y-3 py-8 text-sm text-muted">
          <p className="text-text">{KIT.labels.kit}</p>
          <p>{KIT.labels.testnet} Nothing here is financial advice.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono">
            <li>
              <a href={KIT.repoUrl} target="_blank" rel="noopener noreferrer">
                Source code (MIT)
              </a>
            </li>
            <li>
              <a href={KIT.preflightUrl} target="_blank" rel="noopener noreferrer">
                Preflight
              </a>
            </li>
            <li>
              <a href={PLATFORM.docsUrl} target="_blank" rel="noopener noreferrer">
                Official {PLATFORM.name} docs
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </>
  );
}

/**
 * "Finish setup" banner. Hidden on the official hosted copy (KIT.homeUrl) and
 * shown on every other deployment that has no usable site config. It reads
 * the request host, so kit pages render per request.
 */
async function SetupBanner({ configError }: { configError: string | null }) {
  const host = (await headers()).get("host");
  if (!showSetupBanner(host, configError)) return null;
  return (
    <div role="region" aria-label="Setup status" className="border-b border-line bg-soft">
      <p className="wrap py-2 text-sm text-text">
        {configError ? (
          <>
            <strong>Finish setup.</strong> The {CONFIG_ENV_NAME} value on this deployment could not be used:{" "}
            {configError} <Link href="/setup">Open the setup wizard</Link> to make a new one.
          </>
        ) : (
          <>
            <strong>Finish setup.</strong> Deployed this for your own token? This copy has no site config yet.{" "}
            <Link href="/setup">Open the setup wizard</Link>, then follow the{" "}
            <Link href="/guide">guide</Link>.
          </>
        )}
      </p>
    </div>
  );
}
