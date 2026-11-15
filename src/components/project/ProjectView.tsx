import { NetworkHelper } from "@/components/NetworkHelper";
import { SafeImage } from "@/components/SafeImage";
import { PLATFORM } from "@/config/platform";
import {
  AddressCard,
  Description,
  ExternalLink,
  GateTeaser,
  HoldersTable,
  Links,
  MarketNote,
  Sections,
  Stats,
  SymbolChip,
  TestnetNotice,
  TokenFacts,
  ViewOnPlatform,
  type ProjectViewProps,
} from "./blocks";

/**
 * The project home page in one of three looks. The looks differ in layout
 * and personality only: each one renders the same safety elements (full
 * address with copy and explorer link, the verify line, the testnet notice,
 * and "View on vibe/vibe" as the call to action).
 *
 * These are plain components with no data fetching, so the wizard can render
 * the very same code as a live preview.
 */
export function ProjectView(props: ProjectViewProps) {
  const Look = LOOKS[props.config.look];
  return (
    <div data-look={props.config.look} className="wrap space-y-10 py-8 sm:py-12">
      <Look {...props} />
    </div>
  );
}

/** Bold, image-led, playful type scale. */
function MemeLook(props: ProjectViewProps) {
  const { config, snapshot } = props;
  return (
    <>
      <header className="flex flex-col items-center gap-5 text-center">
        <SafeImage
          src={config.imageUrl}
          name={config.name}
          className="aspect-square w-56 max-w-full -rotate-2 rounded-2xl border-4 border-accent sm:w-72"
        />
        <h1 className="look-title break-words">{config.name}</h1>
        <SymbolChip snapshot={snapshot} />
        <p className="max-w-2xl font-mono text-lg text-text sm:text-2xl">{config.tagline}</p>
        <ViewOnPlatform token={config.token} className="btn btn-primary px-8 text-base" />
        <TestnetNotice />
      </header>
      <AddressCard token={config.token} />
      <Stats snapshot={snapshot} token={config.token} />
      <Description config={config} heading={`What is ${config.name}?`} />
      <GateTeaser {...props} />
      <Sections config={config} />
      <HoldersTable snapshot={snapshot} />
      <Links config={config} />
      <MarketNote token={config.token} />
      <NetworkHelper />
    </>
  );
}

/** Clean, feature-led, demo button prominent. */
function ProductLook(props: ProjectViewProps) {
  const { config, snapshot } = props;
  const demo = config.links?.demo;
  const repo = config.links?.repo;
  return (
    <>
      <header className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <p className="label">{PLATFORM.categories.product}</p>
          <h1 className="look-title break-words">{config.name}</h1>
          <SymbolChip snapshot={snapshot} />
          <p className="text-lg text-text">{config.tagline}</p>
          <div className="flex flex-wrap gap-2">
            {demo && (
              <ExternalLink href={demo} className="btn btn-primary">
                Try the demo
              </ExternalLink>
            )}
            <ViewOnPlatform token={config.token} />
            {repo && (
              <ExternalLink href={repo} className="btn">
                View the code
              </ExternalLink>
            )}
          </div>
          <TestnetNotice />
        </div>
        <SafeImage
          src={config.imageUrl}
          name={config.name}
          className="aspect-[4/3] w-full rounded-lg border border-line"
        />
      </header>
      <Description config={config} heading="What you can try" />
      <Sections config={config} />
      <GateTeaser {...props} />
      <AddressCard token={config.token} />
      <Stats snapshot={snapshot} token={config.token} />
      <HoldersTable snapshot={snapshot} />
      <Links config={config} skip={["demo", "repo"]} />
      <MarketNote token={config.token} />
      <NetworkHelper />
    </>
  );
}

/** Sober, document-like, disclosures prominent. */
function RwaLook(props: ProjectViewProps) {
  const { config, snapshot } = props;
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-4 border-b border-line pb-8">
        <div className="flex items-center gap-4">
          <SafeImage
            src={config.imageUrl}
            name={config.name}
            className="h-16 w-16 shrink-0 rounded-md border border-line text-2xl"
          />
          <div>
            <p className="label">{PLATFORM.categories.rwa}</p>
            <SymbolChip snapshot={snapshot} />
          </div>
        </div>
        <h1 className="look-title break-words">{config.name}</h1>
        <p className="text-lg text-text">{config.tagline}</p>
        <ViewOnPlatform token={config.token} />
      </header>
      <section aria-labelledby="disclosures" className="panel border-warn">
        <h2 id="disclosures" className="text-lg">
          Important disclosures
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text">
          <li>This is a testnet token. Test ETH and testnet tokens have no monetary value.</li>
          <li>
            Any reference to stocks or real-world assets is the creator&apos;s own description. It has not been
            verified by Liftoff or by {PLATFORM.name}, and this token gives no claim on any asset.
          </li>
          <li>Nothing on this site is financial advice, an offer, or a promise of any return.</li>
          <li>The project&apos;s creator runs this site and is solely responsible for its content.</li>
        </ul>
      </section>
      <AddressCard token={config.token} />
      <TokenFacts config={config} snapshot={snapshot} />
      <Stats snapshot={snapshot} token={config.token} />
      <Description config={config} heading="Summary" />
      <Sections config={config} />
      <GateTeaser {...props} />
      <HoldersTable snapshot={snapshot} />
      <Links config={config} />
      <MarketNote token={config.token} />
      <NetworkHelper />
    </div>
  );
}

const LOOKS = { meme: MemeLook, product: ProductLook, rwa: RwaLook } as const;
