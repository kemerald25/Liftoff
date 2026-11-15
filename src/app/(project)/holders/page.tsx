import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NetworkHelper } from "@/components/NetworkHelper";
import { HolderArea } from "@/components/wallet/HolderArea";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { explorerTokenUrl } from "@/config/chain";
import { getSiteMode } from "@/config/site";
import { formatCount } from "@/lib/format";
import { isHolderAreaEnabled } from "@/lib/gate";

export const metadata: Metadata = { title: "Holder area" };

// Checked on every request, so the page follows the server variable.
export const dynamic = "force-dynamic";

export default function HoldersPage() {
  const site = getSiteMode();
  if (site.mode !== "project" || !site.config.gate) notFound();
  const { config } = site;
  const gate = site.config.gate;

  return (
    <div className="wrap max-w-3xl space-y-6 py-8 sm:py-12">
      <header className="space-y-2">
        <p className="label">Holder area</p>
        <h1 className="text-3xl break-words">{gate.title}</h1>
        <p>{gate.teaser}</p>
        <p className="note">
          For wallets holding at least {formatCount(gate.minTokens)} tokens of{" "}
          <a href={explorerTokenUrl(config.token)} target="_blank" rel="noopener noreferrer" className="font-mono break-all">
            {config.token}
          </a>
          .
        </p>
      </header>

      {isHolderAreaEnabled(config) ? (
        <WalletProvider>
          <HolderArea token={config.token} gate={gate} />
        </WalletProvider>
      ) : (
        <section className="panel" data-testid="holder-state" data-state="switched-off">
          <h2 className="text-xl">The holder area is switched off</h2>
          <p className="mt-2">
            The creator of this site has not finished setting it up yet. There is nothing to unlock right now.
          </p>
        </section>
      )}

      <section aria-labelledby="how-it-works" className="space-y-2 text-sm">
        <h2 id="how-it-works" className="text-lg">
          How this works
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>This site never sends a transaction and never asks for an approval.</li>
          <li>
            The only thing you sign is one plain-text sign-in message. The server checks it, reads your token
            balance from the chain, and then sends the content.
          </li>
          <li>Nothing is stored: no account, no cookie. After a reload you simply sign in again.</li>
        </ul>
      </section>

      <NetworkHelper />
      <p>
        <Link href="/">Back to the project page</Link>
      </p>
    </div>
  );
}
