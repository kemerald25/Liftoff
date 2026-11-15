import Link from "next/link";
import { CHAIN } from "@/config/chain";
import { PLATFORM } from "@/config/platform";
import { KIT, deployUrl } from "@/config/site";

const STEPS = [
  {
    title: "Fill in the setup wizard",
    text: "Paste your token's contract address, pick a look, and add your tagline, description and links. A live preview shows your site as you type.",
  },
  {
    title: "Copy your config",
    text: "The wizard gives you one string for your public site and, if you want a holder area, a second private string. Nothing is uploaded.",
  },
  {
    title: "Deploy",
    text: "Press Deploy, paste the strings into the fields Vercel shows, and your site is live. No code editing, no database, no accounts.",
  },
];

export function KitHome() {
  return (
    <div className="wrap space-y-14 py-10 sm:py-16">
      <section aria-labelledby="hero" className="max-w-3xl space-y-5">
        <p className="label">Unofficial launch kit for {PLATFORM.name} builders</p>
        <h1 id="hero" className="text-3xl sm:text-5xl">
          Give your token a real project site in about five minutes.
        </h1>
        <p className="text-lg">
          {KIT.name} is a free, open-source template. It turns a token launched on {PLATFORM.name} ({CHAIN.name})
          into a live website you own: a project page with live token data, and an optional area only
          holders can open.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/setup" className="btn btn-primary">
            Start the setup wizard
          </Link>
          <Link href="/demo" className="btn">
            See a live demo
          </Link>
        </div>
        <p className="note">
          ✓ No code editing. ✓ No sign-up. ✓ {KIT.name} never sends a transaction or asks you to trade.
        </p>
      </section>

      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="text-2xl">
          How it works
        </h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="panel">
              <p className="font-mono text-sm text-accent">Step {index + 1}</p>
              <h3 className="mt-1 text-lg">{step.title}</h3>
              <p className="mt-2 text-sm">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="deploy" className="panel space-y-3">
        <h2 id="deploy" className="text-2xl">
          Ready to deploy?
        </h2>
        <p>
          Make your config in the <Link href="/setup">setup wizard</Link> first. Then deploy your own copy to
          Vercel&apos;s free plan. Vercel will ask for the config string the wizard gave you.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={deployUrl({ withHolderContent: false })}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Deploy to Vercel
          </a>
          <Link href="/guide" className="btn">
            Read the guide
          </Link>
        </div>
        <p className="note">
          Adding a holder area? Use the Deploy button at the end of the wizard instead. It also asks for the
          private holder content.
        </p>
      </section>

      <section aria-labelledby="what" className="grid gap-3 md:grid-cols-2">
        <div className="panel">
          <h2 id="what" className="text-xl">
            What your site includes
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>Your name, tagline, description, links, features, roadmap and FAQ.</li>
            <li>The full contract address with copy and explorer links, so visitors can verify it.</li>
            <li>Live total supply, holder count, transfers and top holders from the explorer.</li>
            <li>Three looks: {Object.values(PLATFORM.categories).join(", ")}.</li>
            <li>An optional holder area, checked on the server.</li>
          </ul>
        </div>
        <div className="panel">
          <h2 className="text-xl">What it will never do</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>Send a transaction, or ask for an approval or permit.</li>
            <li>Show prices, trading prompts or promises of returns.</li>
            <li>Load trackers or third-party scripts.</li>
            <li>Use {PLATFORM.name}&apos;s logo or artwork, or claim to be official.</li>
            <li>Look a token up by name. Tokens are identified by contract address only.</li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="preflight" className="panel space-y-3">
        <p className="label">Part of the same toolkit</p>
        <h2 id="preflight" className="text-xl">
          Not launched yet? Check your launch settings first.
        </h2>
        <p className="text-sm">
          Preflight is a free simulator that shows, in plain language, what your {PLATFORM.name} launch
          settings mean before you sign.
        </p>
        <a href={KIT.preflightUrl} className="btn" target="_blank" rel="noopener noreferrer">
          Open Preflight
        </a>
      </section>
    </div>
  );
}
