import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CONFIG_ENV_NAME, HOLDER_ENV_NAME, KIT } from "@/config/site";

export const metadata: Metadata = { title: "Guide" };

function Step({ children }: { children: ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-soft px-1 py-0.5 font-mono text-[0.9em] break-all text-text">{children}</code>;
}

export default function GuidePage() {
  return (
    <div className="wrap max-w-3xl space-y-10 py-10 sm:py-14">
      <header className="space-y-3">
        <h1 className="text-3xl">Guide</h1>
        <p>Plain-language instructions. No coding needed for any of the first three parts.</p>
        <nav aria-label="On this page">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
            <li>
              <a href="#deploy">Deploying</a>
            </li>
            <li>
              <a href="#edit">Editing later</a>
            </li>
            <li>
              <a href="#domain">Custom domain</a>
            </li>
            <li>
              <a href="#holder-area">Holder area limits</a>
            </li>
            <li>
              <a href="#ai">Customising with AI</a>
            </li>
          </ul>
        </nav>
      </header>

      <section aria-labelledby="deploy" className="space-y-3">
        <h2 id="deploy" className="text-2xl">
          Deploying your site
        </h2>
        <p>You need a free GitHub account and a free Vercel account. Vercel will offer to create both.</p>
        <ol className="list-decimal space-y-2 pl-5">
          <Step>
            Open the <Link href="/setup">setup wizard</Link>. Paste your token&apos;s contract address and
            check that the name, symbol and supply shown are your token.
          </Step>
          <Step>Pick a look and fill in your tagline, description and links. Watch the preview.</Step>
          <Step>
            At the end, press <strong>Copy</strong> next to <strong>Public site config</strong>. If you turned
            on a holder area, there is a second <strong>Copy</strong> button for{" "}
            <strong>Private holder content</strong>.
          </Step>
          <Step>
            Press <strong>Deploy to Vercel</strong>. Vercel copies the {KIT.name} code into your own GitHub
            account and shows a form.
          </Step>
          <Step>
            Paste the public site config into the field named <Code>{CONFIG_ENV_NAME}</Code>. If you have a
            holder area, paste the private holder content into <Code>{HOLDER_ENV_NAME}</Code>.
          </Step>
          <Step>
            Press <strong>Deploy</strong> and wait about a minute. Vercel gives you your site&apos;s address.
          </Step>
        </ol>
        <p className="note">
          If your new site shows the {KIT.name} home page with a &quot;Finish setup&quot; banner, the config
          was not pasted or was cut off. Follow &quot;Editing later&quot; below to set it.
        </p>
      </section>

      <section aria-labelledby="edit" className="space-y-3">
        <h2 id="edit" className="text-2xl">
          Editing your site later
        </h2>
        <p>Your site has no admin page. To change it, you make new strings and swap them in Vercel.</p>
        <ol className="list-decimal space-y-2 pl-5">
          <Step>
            In Vercel, open your project, then <strong>Settings</strong>, then{" "}
            <strong>Environment Variables</strong>. Copy the current value of <Code>{CONFIG_ENV_NAME}</Code>{" "}
            (and <Code>{HOLDER_ENV_NAME}</Code> if you have one).
          </Step>
          <Step>
            Open the <Link href="/setup">setup wizard</Link>, press <strong>Import config</strong>, and paste
            the strings. Your site&apos;s content appears in the form.
          </Step>
          <Step>Change what you want, then copy the new strings.</Step>
          <Step>
            Back in Vercel, edit each variable, replace the old value with the new string, and save.
          </Step>
          <Step>
            Open <strong>Deployments</strong>, press the three dots next to the latest one, and choose{" "}
            <strong>Redeploy</strong>. Your changes are live when it finishes.
          </Step>
        </ol>
        <p className="note">
          Changing a variable does nothing until you redeploy. This is the step people most often miss.
        </p>
      </section>

      <section aria-labelledby="domain" className="space-y-3">
        <h2 id="domain" className="text-2xl">
          Using a custom domain
        </h2>
        <ol className="list-decimal space-y-2 pl-5">
          <Step>
            In Vercel, open your project, then <strong>Settings</strong>, then <strong>Domains</strong>.
          </Step>
          <Step>Type the domain you own and press Add.</Step>
          <Step>
            Vercel shows one or two records to add where you bought the domain. Add them there. It can take
            up to a day to start working, but is usually much faster.
          </Step>
        </ol>
        <p className="note">
          The holder sign-in is tied to the address visitors use. A sign-in made on one domain cannot be
          reused on another, so the holder area works on each of your domains separately with nothing extra
          to set up.
        </p>
      </section>

      <section aria-labelledby="holder-area" className="space-y-3">
        <h2 id="holder-area" className="text-2xl">
          What the holder area can and cannot do
        </h2>
        <p>
          When a visitor opens the holder area, their wallet signs a free plain-text sign-in message. Your
          site&apos;s server checks the signature, reads the wallet&apos;s token balance from the chain at that
          moment, and only then sends the holder content. The content is never inside the public page.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>A holder can copy what they unlock and share it with anyone.</li>
          <li>Someone can buy tokens, unlock the content, then sell.</li>
          <li>
            So never put private keys, passwords, credentials or anything truly sensitive there. Treat it as
            a perk for holders, not a vault.
          </li>
        </ul>
      </section>

      <section aria-labelledby="ai" className="space-y-3">
        <h2 id="ai" className="text-2xl">
          Customising with an AI coding agent
        </h2>
        <p>
          Want something the wizard does not offer, such as a team section or different fonts? The code is
          yours to change, and it is set up so tools like Claude Code or Cursor can do it for you.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <Step>Open your copy of the repository (the one Vercel created in your GitHub account) in the tool.</Step>
          <Step>
            Open the <Code>prompts/</Code> folder, pick a recipe, and paste it into the agent. Each recipe says
            what the agent may change and what it must leave alone.
          </Step>
          <Step>
            Ask the agent to run the checks (<Code>pnpm lint</Code>, <Code>pnpm typecheck</Code>,{" "}
            <Code>pnpm test</Code>, <Code>pnpm build</Code>) and to commit and push. Vercel redeploys on its
            own.
          </Step>
        </ol>
        <p className="note">
          The files <Code>CLAUDE.md</Code> and <Code>AGENTS.md</Code> tell the agent the rules: keep the
          unofficial labels, keep the full address on show, and never add transactions.{" "}
          <a href={`${KIT.repoUrl}/tree/main/prompts`}>Browse the recipes</a>.
        </p>
      </section>
    </div>
  );
}
