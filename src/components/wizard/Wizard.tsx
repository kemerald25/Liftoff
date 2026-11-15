"use client";

import { useEffect, useMemo, useState } from "react";
import { BaseError, HttpRequestError, TimeoutError, getAddress, isAddress, type Address } from "viem";
import { CopyButton } from "@/components/CopyButton";
import { ProjectView } from "@/components/project/ProjectView";
import { CHAIN } from "@/config/chain";
import { PLATFORM, type Look } from "@/config/platform";
import { SAMPLE_CONFIG, SAMPLE_HOLDER_CONTENT } from "@/config/sample";
import { CONFIG_ENV_NAME, HOLDER_ENV_NAME, deployUrl } from "@/config/site";
import { accentCss } from "@/lib/accent";
import {
  LIMITS,
  LINK_KEYS,
  MAX_CONFIG_CHARS,
  MAX_HOLDER_CHARS,
  decodeConfig,
  decodeHolderContent,
  encodeConfig,
  encodeHolderContent,
  fromBase64Url,
  toBase64Url,
  validateConfig,
  validateHolderContent,
} from "@/lib/config";
import { EMPTY_SNAPSHOT, getTokenSnapshot, type TokenSnapshot } from "@/lib/explorer";
import { formatTokenAmount, resolveAccent } from "@/lib/format";
import { createReadClient, readTokenBasics, type TokenBasics } from "@/lib/token";
import {
  EMPTY_DRAFT,
  EMPTY_HOLDER_DRAFT,
  configToDraft,
  draftToConfigInput,
  holderDraftToInput,
  holderToDraft,
  newSection,
  reviveDraft,
  reviveHolderDraft,
  type Draft,
  type DraftSection,
  type HolderDraft,
} from "./draft";
import { Fieldset, SizeMeter, TextArea, TextField } from "./fields";

const HASH_PREFIX = "#d=";
const HOLDER_STORAGE_KEY = "liftoff-wizard-holder-draft";

function loadDraft(): Draft {
  try {
    if (!window.location.hash.startsWith(HASH_PREFIX)) return EMPTY_DRAFT;
    return reviveDraft(JSON.parse(fromBase64Url(window.location.hash.slice(HASH_PREFIX.length))));
  } catch {
    return EMPTY_DRAFT;
  }
}

function loadHolderDraft(): HolderDraft {
  try {
    const stored = window.sessionStorage.getItem(HOLDER_STORAGE_KEY);
    return stored ? reviveHolderDraft(JSON.parse(stored)) : EMPTY_HOLDER_DRAFT;
  } catch {
    return EMPTY_HOLDER_DRAFT;
  }
}

/** Turns "sections.0.items.1.title is required" into something a person can follow. */
function friendly(error: string): string {
  return error
    .replace(/sections\.(\d+)/g, (_, index: string) => `Section ${Number(index) + 1}`)
    .replace(/\.items\.(\d+)/g, (_, index: string) => `, item ${Number(index) + 1}`)
    .replace(/links\.(\d+)/g, (_, index: string) => `Link ${Number(index) + 1}`)
    .replace(/[.](\w+) /g, ": $1 ")
    .replace(/^(\w)/, (letter) => letter.toUpperCase());
}

type TokenResult =
  | { address: Address; status: "found"; basics: TokenBasics; snapshot: TokenSnapshot }
  | { address: Address; status: "missing" | "unreachable" };

const LOOK_NOTES: Record<Look, string> = {
  meme: "Bold, image-led and playful.",
  product: "Clean and feature-led, with your demo button up front.",
  rwa: "Sober and document-like, with disclosures up front.",
};

const SECTION_NAMES: Record<DraftSection["type"], string> = {
  about: "About",
  features: "Features",
  roadmap: "Roadmap",
  faq: "FAQ",
};

const LINK_FIELDS: Record<(typeof LINK_KEYS)[number], string> = {
  website: "Website",
  demo: "Working demo",
  repo: "Code repository",
  x: "X (Twitter)",
  telegram: "Telegram",
  discord: "Discord",
};

export default function Wizard() {
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [holder, setHolder] = useState<HolderDraft>(loadHolderDraft);
  const [tokenResult, setTokenResult] = useState<TokenResult | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  /* ---------- persistence: public draft in the URL hash, private text in this tab only ---------- */
  useEffect(() => {
    const save = () => {
      const hash = draft === EMPTY_DRAFT ? window.location.pathname : HASH_PREFIX + toBase64Url(JSON.stringify(draft));
      window.history.replaceState(null, "", hash);
    };
    const timer = setTimeout(save, 300);
    // Save straight away if the page is refreshed or closed before the timer fires.
    window.addEventListener("pagehide", save);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [draft]);

  useEffect(() => {
    const save = () => {
      try {
        window.sessionStorage.setItem(HOLDER_STORAGE_KEY, JSON.stringify(holder));
      } catch {
        // Storage unavailable: the private text simply will not survive a refresh.
      }
    };
    const timer = setTimeout(save, 300);
    window.addEventListener("pagehide", save);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [holder]);

  /* ---------- live token check, by contract address only ---------- */
  const typedToken = draft.token.trim();
  const validToken = isAddress(typedToken) ? getAddress(typedToken) : null;

  useEffect(() => {
    if (!validToken) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let result: TokenResult;
      try {
        const [basics, snapshot] = await Promise.all([
          readTokenBasics(createReadClient(), validToken),
          getTokenSnapshot(validToken),
        ]);
        result = { address: validToken, status: "found", basics, snapshot };
      } catch (error) {
        const network =
          error instanceof BaseError &&
          error.walk((cause) => cause instanceof HttpRequestError || cause instanceof TimeoutError) !== null;
        result = { address: validToken, status: network ? "unreachable" : "missing" };
      }
      if (!cancelled) setTokenResult(result);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [validToken]);

  const token = validToken && tokenResult?.address === validToken ? tokenResult : null;
  const checking = validToken !== null && token === null;

  /* ---------- validation and output ---------- */
  const configInput = useMemo(() => draftToConfigInput(draft), [draft]);
  const validated = useMemo(() => validateConfig(configInput), [configInput]);
  const encoded = useMemo(() => encodeConfig(configInput), [configInput]);
  const holderInput = useMemo(() => holderDraftToInput(holder), [holder]);
  const holderValid = useMemo(() => validateHolderContent(holderInput), [holderInput]);
  const holderEncoded = useMemo(() => encodeHolderContent(holderInput), [holderInput]);

  const publicReady = encoded.ok && (!draft.gateEnabled || holderEncoded.ok);
  const publicString = publicReady && encoded.ok ? encoded.value : "";
  const privateString = draft.gateEnabled && publicReady && holderEncoded.ok ? holderEncoded.value : "";

  const previewSnapshot: TokenSnapshot = useMemo(() => {
    if (token?.status !== "found") return EMPTY_SNAPSHOT;
    const { basics, snapshot } = token;
    return {
      ...snapshot,
      info: snapshot.info ?? {
        name: basics.name,
        symbol: basics.symbol,
        decimals: basics.decimals,
        totalSupply: basics.totalSupply,
        holdersCount: null,
        type: null,
      },
    };
  }, [token]);

  const accent = resolveAccent(draft.accent.trim().toLowerCase());

  return (
    <div className="mx-auto grid w-full max-w-[90rem] gap-6 px-4 py-8 sm:px-6 xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        <header className="space-y-2">
          <h1 className="text-3xl">Setup wizard</h1>
          <p>
            Fill this in, copy the strings at the end, and deploy. Everything here runs in your browser.
            Nothing you type is uploaded.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-small"
              data-testid="load-sample"
              onClick={() => {
                const sample = validateConfig(SAMPLE_CONFIG);
                const sampleHolder = validateHolderContent(SAMPLE_HOLDER_CONTENT);
                if (sample.ok) setDraft(configToDraft(sample.value));
                if (sampleHolder.ok) setHolder(holderToDraft(sampleHolder.value));
              }}
            >
              Load the sample
            </button>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setHolder(EMPTY_HOLDER_DRAFT);
              }}
            >
              Start over
            </button>
          </div>
        </header>

        <ImportPanel
          onImport={(nextDraft, nextHolder) => {
            setDraft(nextDraft);
            if (nextHolder) setHolder(nextHolder);
          }}
        />

        <Fieldset step="Step 1" title="Your token">
          <TextField
            label="Token contract address"
            required
            mono
            value={draft.token}
            placeholder="0x…"
            maxLength={42}
            testId="token-input"
            onChange={(value) => set("token", value)}
            hint={
              <>
                Copy it from your token&apos;s page on {PLATFORM.name}. Liftoff identifies tokens by address
                only, never by name, because many tokens share names.
              </>
            }
          />
          <div role="status" aria-live="polite" data-testid="token-status" className="text-sm">
            {typedToken !== "" && !validToken && (
              <p className="text-danger">
                This is not a valid address. It should be 0x followed by 40 letters and numbers. Paste it
                again to rule out a typo.
              </p>
            )}
            {checking && <p className="text-muted">Checking the address on {CHAIN.name}…</p>}
            {token?.status === "missing" && (
              <p className="text-danger">
                No token was found at this address on {CHAIN.name}. Check that you copied the token&apos;s
                contract address, not a wallet address.
              </p>
            )}
            {token?.status === "unreachable" && (
              <p className="text-warn">
                The network could not be reached to check this address. You can keep going, but check the
                address carefully yourself.
              </p>
            )}
            {token?.status === "found" && (
              <div className="rounded-md border border-line bg-soft p-3 text-text">
                <p className="label">Found on chain. Is this your token?</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt className="text-muted">Name</dt>
                  <dd className="break-words">{token.basics.name}</dd>
                  <dt className="text-muted">Symbol</dt>
                  <dd className="break-words">{token.basics.symbol}</dd>
                  <dt className="text-muted">Total supply</dt>
                  <dd className="font-mono">
                    {formatTokenAmount(token.basics.totalSupply, token.basics.decimals, 0)}
                  </dd>
                </dl>
                {draft.name.trim() === "" && (
                  <button
                    type="button"
                    className="btn btn-small mt-3"
                    onClick={() => set("name", token.basics.name.slice(0, LIMITS.name))}
                  >
                    Use this name for my site
                  </button>
                )}
              </div>
            )}
          </div>
        </Fieldset>

        <Fieldset step="Step 2" title="Pick a look">
          <div role="radiogroup" aria-label="Look" className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(PLATFORM.categories) as Look[]).map((look) => (
              <label
                key={look}
                className={`cursor-pointer rounded-md border p-3 ${
                  draft.look === look ? "border-accent bg-soft" : "border-line bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="look"
                  className="mr-2 accent-(--accent)"
                  checked={draft.look === look}
                  data-testid={`look-${look}`}
                  onChange={() => set("look", look)}
                />
                <span className="font-mono text-sm font-medium text-text">{PLATFORM.categories[look]}</span>
                <span className="note mt-1 block">{LOOK_NOTES[look]}</span>
              </label>
            ))}
          </div>
          <p className="note">All three looks show the same safety information. Only the style differs.</p>
        </Fieldset>

        <Fieldset step="Step 3" title="Describe your project">
          <TextField
            label="Project name"
            required
            value={draft.name}
            maxLength={LIMITS.name}
            testId="name-input"
            onChange={(value) => set("name", value)}
          />
          <TextField
            label="Tagline"
            required
            value={draft.tagline}
            maxLength={LIMITS.tagline}
            testId="tagline-input"
            onChange={(value) => set("tagline", value)}
            hint="One sentence on what this project is. Avoid price talk or promises."
          />
          <TextArea
            label="Description"
            required
            rows={6}
            value={draft.description}
            maxLength={LIMITS.description}
            testId="description-input"
            onChange={(value) => set("description", value)}
            hint="Say clearly what people can try. Simple formatting works: **bold**, *italic*, - lists, and [links](https://…)."
          />
          <TextField
            label="Image link"
            type="url"
            value={draft.imageUrl}
            maxLength={LIMITS.url}
            placeholder="https://…"
            onChange={(value) => set("imageUrl", value)}
            hint="A link to an image that is already online, starting with https://. Use your own artwork."
          />
          <div>
            <TextField
              label="Accent colour"
              mono
              value={draft.accent}
              maxLength={7}
              placeholder="#dff902"
              onChange={(value) => set("accent", value)}
              hint="A hex colour. It is only used where it is easy to read; otherwise the default stays."
            />
            {draft.accent.trim() !== "" && (
              <p className="note mt-1" role="status">
                Dark theme: {accent.dark ? "your colour is used" : "default kept (too hard to read)"}. Light
                theme: {accent.light ? "your colour is used" : "default kept (too hard to read)"}.
              </p>
            )}
          </div>
        </Fieldset>

        <Fieldset step="Step 4" title="Links">
          <p className="note">
            The {PLATFORM.name} docs ask Product &amp; Utility builders to link a working demo or repository.
            Links must start with https://.
          </p>
          {LINK_KEYS.map((key) => (
            <TextField
              key={key}
              label={LINK_FIELDS[key]}
              type="url"
              value={draft.links[key]}
              maxLength={LIMITS.url}
              placeholder="https://…"
              testId={`link-${key}`}
              onChange={(value) => set("links", { ...draft.links, [key]: value })}
            />
          ))}
        </Fieldset>

        <SectionsStep sections={draft.sections} onChange={(sections) => set("sections", sections)} />

        <Fieldset step="Step 6" title="Holder area">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-(--accent)"
              checked={draft.gateEnabled}
              data-testid="gate-toggle"
              onChange={(event) => set("gateEnabled", event.target.checked)}
            />
            <span className="text-sm text-text">
              Add an area that only holders of my token can open
              <span className="note block">Optional. Leave this off for a simple project page.</span>
            </span>
          </label>
          {draft.gateEnabled && (
            <>
              <div className="rounded-md border border-line bg-soft p-3 text-sm text-text">
                <p>
                  <strong>How it works.</strong> A visitor signs a free sign-in message with their wallet;
                  your site&apos;s server checks the signature and their token balance, and only then sends
                  the content below.
                </p>
                <p className="mt-2">
                  <strong>What it cannot prevent.</strong> A holder can copy and share what they unlock, and
                  someone can buy, unlock, then sell, so never put private keys, passwords or anything truly
                  sensitive here.
                </p>
              </div>
              <TextField
                label="Tokens needed to unlock"
                required
                mono
                value={draft.gate.minTokens}
                maxLength={10}
                testId="gate-min"
                onChange={(value) => set("gate", { ...draft.gate, minTokens: value.replace(/[^0-9]/g, "") })}
                hint="A whole number of tokens, for example 1000. The total supply is 1,000,000,000."
              />
              <TextField
                label="Title (public)"
                required
                value={draft.gate.title}
                maxLength={LIMITS.gateTitle}
                testId="gate-title"
                onChange={(value) => set("gate", { ...draft.gate, title: value })}
              />
              <TextArea
                label="Teaser (public)"
                required
                rows={2}
                value={draft.gate.teaser}
                maxLength={LIMITS.gateTeaser}
                testId="gate-teaser"
                onChange={(value) => set("gate", { ...draft.gate, teaser: value })}
                hint="Everyone sees this before unlocking. Say what holders get."
              />
              <TextArea
                label="Holder content (private)"
                required
                rows={6}
                value={holder.body}
                maxLength={LIMITS.holderBody}
                testId="holder-body"
                onChange={(value) => setHolder((current) => ({ ...current, body: value }))}
                hint="Never sent anywhere: it stays in this browser tab and goes only into the private string you copy. It is not saved in this page's address."
              />
              <HolderLinks
                links={holder.links}
                onChange={(links) => setHolder((current) => ({ ...current, links }))}
              />
            </>
          )}
        </Fieldset>

        <Fieldset step="Step 7" title="Copy your strings and deploy">
          {!validated.ok && (
            <p className="text-sm text-danger" role="status" data-testid="config-error">
              Not ready yet: {friendly(validated.error)}.
            </p>
          )}
          {validated.ok && !encoded.ok && (
            <p className="text-sm text-danger" role="status">
              {encoded.error}
            </p>
          )}
          {validated.ok && draft.gateEnabled && !holderEncoded.ok && (
            <p className="text-sm text-danger" role="status" data-testid="holder-error">
              Holder content is not ready: {holderValid.ok ? holderEncoded.error : friendly(holderValid.error)}.
            </p>
          )}

          <OutputString
            title="Public site config"
            envName={CONFIG_ENV_NAME}
            note="Safe to share. It only contains what your public page shows."
            value={publicString}
            limit={MAX_CONFIG_CHARS}
            testId="public-config"
          />
          {draft.gateEnabled && (
            <OutputString
              title="Private holder content"
              envName={HOLDER_ENV_NAME}
              note="Keep this one to yourself. Paste it only into Vercel."
              value={privateString}
              limit={MAX_HOLDER_CHARS}
              testId="private-content"
            />
          )}

          <div className="space-y-2 border-t border-line pt-4">
            <a
              href={publicReady ? deployUrl({ withHolderContent: draft.gateEnabled }) : undefined}
              aria-disabled={!publicReady}
              className={`btn btn-primary ${publicReady ? "" : "pointer-events-none opacity-60"}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="deploy-button"
            >
              Deploy to Vercel
            </a>
            <p className="note">
              Vercel will show {draft.gateEnabled ? "two fields" : "one field"}. Paste{" "}
              {draft.gateEnabled ? "each string into the field with the matching name" : "the string into it"}
              . To change your site later, come back here and use Import config.
            </p>
          </div>
        </Fieldset>
      </div>

      <section aria-labelledby="preview-title" className="min-w-0 xl:sticky xl:top-20 xl:self-start">
        <h2 id="preview-title" className="label mb-2">
          Live preview
        </h2>
        <div
          className="wizard-preview max-h-[78vh] overflow-auto rounded-lg border border-line bg-bg"
          data-testid="preview"
        >
          {validated.ok ? (
            <>
              <style dangerouslySetInnerHTML={{ __html: accentCss(validated.value.accent, ".wizard-preview") }} />
              <ProjectView
                config={validated.value}
                snapshot={previewSnapshot}
                holderAreaEnabled={draft.gateEnabled}
                preview
              />
            </>
          ) : (
            <p className="p-6 text-sm text-muted">
              Your preview appears here once the required fields are filled in: a valid token address, a
              name, a tagline and a description.
            </p>
          )}
        </div>
        <p className="note mt-2">
          The preview uses live data for your token. Your real site also shows your required footer label.
        </p>
      </section>
    </div>
  );
}

/* ---------- pieces ---------- */

function OutputString({
  title,
  envName,
  note,
  value,
  limit,
  testId,
}: {
  title: string;
  envName: string;
  note: string;
  value: string;
  limit: number;
  testId: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base">{title}</h3>
          <p className="note">
            Goes into <code className="font-mono break-all text-text">{envName}</code>. {note}
          </p>
        </div>
        <CopyButton value={value} label={`Copy ${title.toLowerCase()}`} describe={title.toLowerCase()} />
      </div>
      <textarea
        readOnly
        rows={3}
        className="input font-mono text-xs break-all"
        value={value}
        aria-label={title}
        placeholder="Appears when the form above is complete."
        data-testid={testId}
        onFocus={(event) => event.target.select()}
      />
      <SizeMeter used={value.length} limit={limit} label="Size" />
    </div>
  );
}

function ImportPanel({ onImport }: { onImport: (draft: Draft, holder: HolderDraft | null) => void }) {
  const [publicText, setPublicText] = useState("");
  const [privateText, setPrivateText] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    const config = decodeConfig(publicText);
    if (!config.ok) {
      setMessage({ ok: false, text: config.error });
      return;
    }
    let holder: HolderDraft | null = null;
    if (privateText.trim() !== "") {
      const content = decodeHolderContent(privateText);
      if (!content.ok) {
        setMessage({ ok: false, text: content.error });
        return;
      }
      holder = holderToDraft(content.value);
    }
    onImport(configToDraft(config.value), holder);
    setPublicText("");
    setPrivateText("");
    setMessage({ ok: true, text: "Imported. Your site's content is now in the form below." });
  }

  return (
    <details className="panel">
      <summary className="cursor-pointer font-mono text-sm font-medium text-text" data-testid="import-toggle">
        Import config (edit an existing site)
      </summary>
      <div className="mt-4 space-y-3">
        <p className="note">
          Paste the strings from your Vercel project&apos;s Environment Variables. They are read in your
          browser only.
        </p>
        <TextArea
          label="Public site config"
          required
          rows={3}
          value={publicText}
          testId="import-public"
          onChange={setPublicText}
        />
        <TextArea
          label="Private holder content"
          rows={3}
          value={privateText}
          testId="import-private"
          onChange={setPrivateText}
          hint="Only if your site has a holder area."
        />
        <button type="button" className="btn" onClick={run} data-testid="import-run">
          Import
        </button>
        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-text" : "text-danger"}`} data-testid="import-message">
            {message.text}
          </p>
        )}
      </div>
    </details>
  );
}

function HolderLinks({
  links,
  onChange,
}: {
  links: HolderDraft["links"];
  onChange: (links: HolderDraft["links"]) => void;
}) {
  const update = (index: number, patch: Partial<HolderDraft["links"][number]>) =>
    onChange(links.map((link, position) => (position === index ? { ...link, ...patch } : link)));
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text">
        Holder links (private) <span className="font-normal text-muted">(optional)</span>
      </p>
      {links.map((link, index) => (
        <div key={index} className="space-y-2 rounded-md border border-line p-3">
          <TextField
            label={`Link ${index + 1} label`}
            required
            value={link.label}
            maxLength={LIMITS.holderLinkLabel}
            onChange={(value) => update(index, { label: value })}
          />
          <TextField
            label={`Link ${index + 1} address`}
            required
            type="url"
            value={link.url}
            maxLength={LIMITS.url}
            placeholder="https://…"
            onChange={(value) => update(index, { url: value })}
          />
          <button
            type="button"
            className="btn btn-small"
            onClick={() => onChange(links.filter((_, position) => position !== index))}
          >
            Remove link {index + 1}
          </button>
        </div>
      ))}
      {links.length < LIMITS.holderLinks && (
        <button type="button" className="btn btn-small" onClick={() => onChange([...links, { label: "", url: "" }])}>
          Add a holder link
        </button>
      )}
    </div>
  );
}

function SectionsStep({
  sections,
  onChange,
}: {
  sections: DraftSection[];
  onChange: (sections: DraftSection[]) => void;
}) {
  const replace = (index: number, section: DraftSection) =>
    onChange(sections.map((current, position) => (position === index ? section : current)));
  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target] as DraftSection, next[index] as DraftSection];
    onChange(next);
  };

  return (
    <Fieldset step="Step 5" title="Extra sections">
      <p className="note">Optional blocks, shown in this order. Up to {LIMITS.sections}.</p>
      {sections.map((section, index) => (
        <div key={index} className="space-y-3 rounded-md border border-line p-3" data-testid={`section-${index}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="label">
              Section {index + 1}: {SECTION_NAMES[section.type]}
            </p>
            <div className="flex flex-wrap gap-1">
              <button type="button" className="btn btn-small" disabled={index === 0} onClick={() => move(index, -1)}>
                Move up<span className="sr-only"> section {index + 1}</span>
              </button>
              <button
                type="button"
                className="btn btn-small"
                disabled={index === sections.length - 1}
                onClick={() => move(index, 1)}
              >
                Move down<span className="sr-only"> section {index + 1}</span>
              </button>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => onChange(sections.filter((_, position) => position !== index))}
              >
                Remove<span className="sr-only"> section {index + 1}</span>
              </button>
            </div>
          </div>
          <TextField
            label="Heading"
            required={section.type === "features"}
            value={section.title}
            maxLength={LIMITS.sectionTitle}
            onChange={(value) => replace(index, { ...section, title: value })}
          />
          {section.type === "about" && (
            <TextArea
              label="Text"
              required
              rows={4}
              value={section.body}
              maxLength={LIMITS.aboutBody}
              onChange={(value) => replace(index, { ...section, body: value })}
            />
          )}
          {(section.type === "features" || section.type === "roadmap") && (
            <>
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="space-y-2 border-l-2 border-line pl-3">
                  <TextField
                    label={`Item ${itemIndex + 1} title`}
                    required
                    value={item.title}
                    maxLength={LIMITS.itemTitle}
                    testId={`section-${index}-item-${itemIndex}-title`}
                    onChange={(value) =>
                      replace(index, {
                        ...section,
                        items: section.items.map((current, position) =>
                          position === itemIndex ? { ...current, title: value } : current,
                        ),
                      })
                    }
                  />
                  <TextField
                    label={`Item ${itemIndex + 1} text`}
                    value={item.text}
                    maxLength={LIMITS.itemText}
                    testId={`section-${index}-item-${itemIndex}-text`}
                    onChange={(value) =>
                      replace(index, {
                        ...section,
                        items: section.items.map((current, position) =>
                          position === itemIndex ? { ...current, text: value } : current,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              {section.items.length < LIMITS.featureItems && (
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => replace(index, { ...section, items: [...section.items, { title: "", text: "" }] })}
                >
                  Add an item
                </button>
              )}
            </>
          )}
          {section.type === "faq" && (
            <>
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="space-y-2 border-l-2 border-line pl-3">
                  <TextField
                    label={`Question ${itemIndex + 1}`}
                    required
                    value={item.q}
                    maxLength={LIMITS.faqQuestion}
                    onChange={(value) =>
                      replace(index, {
                        ...section,
                        items: section.items.map((current, position) =>
                          position === itemIndex ? { ...current, q: value } : current,
                        ),
                      })
                    }
                  />
                  <TextArea
                    label={`Answer ${itemIndex + 1}`}
                    required
                    rows={2}
                    value={item.a}
                    maxLength={LIMITS.faqAnswer}
                    onChange={(value) =>
                      replace(index, {
                        ...section,
                        items: section.items.map((current, position) =>
                          position === itemIndex ? { ...current, a: value } : current,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              {section.items.length < LIMITS.faqItems && (
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => replace(index, { ...section, items: [...section.items, { q: "", a: "" }] })}
                >
                  Add a question
                </button>
              )}
            </>
          )}
        </div>
      ))}
      {sections.length < LIMITS.sections && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SECTION_NAMES) as DraftSection["type"][]).map((type) => (
            <button
              key={type}
              type="button"
              className="btn btn-small"
              data-testid={`add-${type}`}
              onClick={() => onChange([...sections, newSection(type)])}
            >
              Add {SECTION_NAMES[type]}
            </button>
          ))}
        </div>
      )}
    </Fieldset>
  );
}
