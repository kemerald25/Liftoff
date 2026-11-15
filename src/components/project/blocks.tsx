import type { ReactNode } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Markdown } from "@/components/Markdown";
import { UpdatedAgo } from "@/components/UpdatedAgo";
import { CHAIN, explorerAddressUrl, explorerTokenUrl } from "@/config/chain";
import { PLATFORM } from "@/config/platform";
import { KIT } from "@/config/site";
import { LINK_KEYS, type LinkKey, type Section, type SiteConfig } from "@/lib/config";
import type { TokenSnapshot } from "@/lib/explorer";
import { formatCount, formatTokenAmount, percentOfSupply, shortAddress } from "@/lib/format";

/**
 * Building blocks shared by all three looks. The safety elements (full
 * address, verify line, testnet notice, "View on vibe/vibe") live here so
 * every look carries them unchanged.
 */

export type ProjectViewProps = {
  config: SiteConfig;
  snapshot: TokenSnapshot;
  holderAreaEnabled: boolean;
  /** True inside the wizard preview and the kit demo, where /holders does not exist. */
  preview?: boolean;
};

export function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function ViewOnPlatform({ token, className = "btn btn-primary" }: { token: string; className?: string }) {
  return (
    <ExternalLink href={PLATFORM.tokenPageUrl(token)} className={className}>
      View on {PLATFORM.name}
    </ExternalLink>
  );
}

export function SymbolChip({ snapshot }: { snapshot: TokenSnapshot }) {
  const symbol = snapshot.info?.symbol;
  if (!symbol) return null;
  return <span className="tag text-xs">{symbol}</span>;
}

export function TestnetNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`rounded-md border border-line bg-soft px-3 py-2 text-sm text-text ${className}`}>
      <strong className="font-mono text-xs tracking-wider uppercase">Testnet</strong>{" "}
      <span>{KIT.labels.testnet.replace("Testnet only. ", "")}</span>
    </p>
  );
}

export function AddressCard({ token }: { token: string }) {
  return (
    <section aria-labelledby="contract-address" className="panel">
      <h2 id="contract-address" className="label">
        Token contract address
      </h2>
      <p className="mt-2 font-mono text-sm break-all text-text sm:text-base" data-testid="token-address">
        {token}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton value={token} label="Copy address" describe="contract address" />
        <ExternalLink href={explorerTokenUrl(token)} className="btn btn-small">
          Open in explorer
        </ExternalLink>
      </div>
      <p className="mt-3 text-sm text-text">
        {KIT.labels.verifyAddress}{" "}
        <span className="text-muted">
          Many tokens share the same name. Only the address identifies this one, on {CHAIN.name} (chain ID{" "}
          {CHAIN.id}).
        </span>
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <dt className="label">{label}</dt>
      <dd className="mt-1 font-mono text-lg break-words text-text sm:text-xl">
        {value ?? <span className="text-sm text-muted">Unavailable</span>}
      </dd>
    </div>
  );
}

export function Stats({ snapshot, token }: { snapshot: TokenSnapshot; token: string }) {
  const { info, counters } = snapshot;
  const decimals = info?.decimals ?? PLATFORM.token.decimals;
  const supply = info?.totalSupply != null ? formatTokenAmount(info.totalSupply, decimals, 0) : null;
  const holders = counters?.holdersCount ?? info?.holdersCount ?? null;
  const transfers = counters?.transfersCount ?? null;

  return (
    <section aria-labelledby="live-stats">
      <h2 id="live-stats" className="label">
        Live token data
      </h2>
      <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Stat label="Total supply" value={supply} />
        <Stat label="Holders" value={holders !== null ? formatCount(holders) : null} />
        <Stat label="Transfers" value={transfers !== null ? formatCount(transfers) : null} />
      </dl>
      <p className="note mt-2" data-testid="stats-note">
        {snapshot.fetchedAt !== null ? (
          <>
            From the explorer, <UpdatedAgo at={snapshot.fetchedAt} />.
          </>
        ) : (
          <>
            Live data is unavailable right now. The explorer may be busy.{" "}
            <ExternalLink href={explorerTokenUrl(token)}>Open the explorer</ExternalLink>{" "}
            or try again in a minute.
          </>
        )}
      </p>
    </section>
  );
}


export function MarketNote({ token }: { token: string }) {
  return (
    <p className="note">
      This site shows no prices or market data. For market information, see{" "}
      <ExternalLink href={PLATFORM.tokenPageUrl(token)}>this token&apos;s page on {PLATFORM.name}</ExternalLink>
      . Nothing here is financial advice.
    </p>
  );
}

export function Description({ config, heading = "About" }: { config: SiteConfig; heading?: string }) {
  return (
    <section aria-labelledby="description">
      <h2 id="description" className="text-xl">
        {heading}
      </h2>
      <Markdown source={config.description} className="mt-3" />
    </section>
  );
}

const SECTION_DEFAULT_TITLES: Record<Section["type"], string> = {
  about: "More about this project",
  features: "Features",
  roadmap: "Roadmap",
  faq: "Questions and answers",
};

export function SectionBlock({ section, index }: { section: Section; index: number }) {
  const id = `section-${index}`;
  const title = section.title ?? SECTION_DEFAULT_TITLES[section.type];
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl">
        {title}
      </h2>
      {section.type === "about" && <Markdown source={section.body} className="mt-3" />}
      {section.type === "features" && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {section.items.map((item, itemIndex) => (
            <li key={itemIndex} className="rounded-md border border-line bg-surface p-4">
              <h3 className="text-base">{item.title}</h3>
              {item.text && <p className="mt-1 text-sm">{item.text}</p>}
            </li>
          ))}
        </ul>
      )}
      {section.type === "roadmap" && (
        <ol className="mt-3 space-y-2">
          {section.items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex gap-3 rounded-md border border-line bg-surface p-4">
              <span aria-hidden="true" className="font-mono text-sm text-accent">
                {String(itemIndex + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-base">{item.title}</h3>
                {item.text && <p className="mt-1 text-sm">{item.text}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {section.type === "faq" && (
        <dl className="mt-3 space-y-2">
          {section.items.map((item, itemIndex) => (
            <div key={itemIndex} className="rounded-md border border-line bg-surface p-4">
              <dt className="font-mono text-sm font-medium text-text">{item.q}</dt>
              <dd className="mt-1 text-sm">{item.a}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function Sections({ config }: { config: SiteConfig }) {
  return <>{config.sections?.map((section, index) => <SectionBlock key={index} section={section} index={index} />)}</>;
}

export const LINK_LABELS: Record<LinkKey, string> = {
  website: "Website",
  demo: "Demo",
  repo: "Repository",
  x: "X",
  telegram: "Telegram",
  discord: "Discord",
};

export function Links({ config, skip = [] }: { config: SiteConfig; skip?: LinkKey[] }) {
  const entries = LINK_KEYS.flatMap((key) => {
    const href = config.links?.[key];
    return href && !skip.includes(key) ? [{ key, href }] : [];
  });
  if (entries.length === 0) return null;
  return (
    <section aria-labelledby="project-links">
      <h2 id="project-links" className="label">
        Links from the creator
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {entries.map(({ key, href }) => (
          <li key={key}>
            <ExternalLink href={href} className="btn btn-small">
              {LINK_LABELS[key]}
            </ExternalLink>
          </li>
        ))}
      </ul>
      <p className="note mt-2">These links were added by the project&apos;s creator and are not checked by Liftoff.</p>
    </section>
  );
}

export function HoldersTable({ snapshot }: { snapshot: TokenSnapshot }) {
  const { holders, info } = snapshot;
  const decimals = info?.decimals ?? PLATFORM.token.decimals;
  const totalSupply = info?.totalSupply ?? null;

  return (
    <section aria-labelledby="top-holders">
      <h2 id="top-holders" className="text-xl">
        Top 10 holders
      </h2>
      {holders === null ? (
        <p className="note mt-3">The holder list is unavailable right now. Try again in a minute.</p>
      ) : holders.length === 0 ? (
        <p className="note mt-3">The explorer lists no holders yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <caption className="sr-only">Ten largest holders of this token, from the explorer</caption>
            <thead className="bg-surface">
              <tr>
                <th scope="col" className="label px-3 py-2">
                  #
                </th>
                <th scope="col" className="label px-3 py-2">
                  Address
                </th>
                <th scope="col" className="label px-3 py-2 text-right">
                  Tokens
                </th>
                <th scope="col" className="label px-3 py-2 text-right">
                  Of supply
                </th>
              </tr>
            </thead>
            <tbody>
              {holders.map((holder, index) => (
                <tr key={holder.address} className="border-t border-line">
                  <td className="px-3 py-2 font-mono text-muted">{index + 1}</td>
                  <td className="px-3 py-2">
                    <ExternalLink href={explorerAddressUrl(holder.address)} className="font-mono">
                      <span title={holder.address}>{shortAddress(holder.address)}</span>
                    </ExternalLink>{" "}
                    {holder.isContract && <span className="tag">Contract</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text">
                    {formatTokenAmount(holder.value, decimals, 0)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text">
                    {totalSupply !== null ? percentOfSupply(holder.value, totalSupply) : "Unavailable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="note mt-2">
        Entries tagged &quot;Contract&quot; are smart contracts, not people. They can include the launchpad&apos;s
        curve and liquidity. Liftoff does not know what each contract is.
      </p>
    </section>
  );
}

export function GateTeaser({ config, holderAreaEnabled, preview }: ProjectViewProps) {
  if (!config.gate) return null;
  if (!holderAreaEnabled && !preview) return null;
  return (
    <section aria-labelledby="holder-area" className="panel border-accent">
      <p className="label">Holder area</p>
      <h2 id="holder-area" className="mt-1 text-xl">
        {config.gate.title}
      </h2>
      <p className="mt-2">{config.gate.teaser}</p>
      <p className="note mt-2">
        For wallets holding at least {formatCount(config.gate.minTokens)} tokens. Unlocking is a free sign-in,
        never a transaction.
      </p>
      {preview ? (
        <p className="btn mt-4 cursor-default opacity-80">Holder area opens on the live site</p>
      ) : (
        // A plain link keeps this block usable inside client-rendered previews.
        <a href="/holders" className="btn mt-4">
          Open the holder area
        </a>
      )}
    </section>
  );
}

export function TokenFacts({ config, snapshot }: { config: SiteConfig; snapshot: TokenSnapshot }) {
  const { info } = snapshot;
  const rows: [string, string][] = [
    ["Name on chain", info?.name ?? "Unavailable"],
    ["Symbol on chain", info?.symbol ?? "Unavailable"],
    ["Network", `${CHAIN.name} (chain ID ${CHAIN.id})`],
    ["Standard", info?.type ?? PLATFORM.token.standard],
    ["Category chosen by the creator", PLATFORM.categories[config.look]],
  ];
  return (
    <section aria-labelledby="token-facts">
      <h2 id="token-facts" className="text-xl">
        Token facts
      </h2>
      <dl className="mt-3 divide-y divide-line rounded-md border border-line text-sm">
        {rows.map(([term, detail]) => (
          <div key={term} className="grid gap-1 px-3 py-2 sm:grid-cols-[14rem_1fr]">
            <dt className="text-muted">{term}</dt>
            <dd className="break-words text-text">{detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
