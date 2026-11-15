# Liftoff: guide for AI coding agents

Liftoff is an unofficial, open-source kit that turns a token launched on vibe/vibe (Robinhood Chain
Testnet) into a project website. The person asking you for changes is often not a developer. Explain
what you changed in plain language, and run the checks before you say you are done.

`AGENTS.md` contains the same rules for other tools. Keep the two files in sync.

## Rules you must not break

These protect visitors and the builder. If a request conflicts with one, say so and suggest an
alternative instead of doing it.

1. **No transactions, one kind of signature.** Wallet use is limited to: connect, switch or add the
   network, read a balance, and sign one plain-text sign-in message for the holder area. Never add
   code that sends a transaction, asks for a token allowance or a permit, or requests a typed-data
   signature. `src/lib/__tests__/safety.test.ts` enforces this.
2. **Keep the labels.** Kit mode shows "Unofficial community tool. Not affiliated with or endorsed by
   vibe/vibe." Project mode shows the "Made with Liftoff…" footer. They live in `KIT.labels`
   (`src/config/site.ts`). Do not remove, hide, shrink or reword them.
3. **Keep the address on show.** Every project site shows the full contract address with copy and
   explorer links and the line "Verify this address before you trust any site." (`AddressCard` in
   `src/components/project/blocks.tsx`).
4. **Identify tokens by contract address only.** Never look up or match a token by name or symbol.
5. **The holder gate stays on the server.** Holder content is read only from the server-only variable
   `LIFTOFF_HOLDER_CONTENT`, in `src/lib/gate.ts` and `src/app/api/holders/route.ts`. Never import
   `@/lib/gate` from a `"use client"` file, never prefix that variable with `NEXT_PUBLIC_`, never store
   unlocked content in the browser, and never log messages, signatures or content.
6. **Exactly two environment variables.** `NEXT_PUBLIC_LIFTOFF_CONFIG` and the optional
   `LIFTOFF_HOLDER_CONTENT`. No database, accounts, API keys or sessions.
7. **No financial advice.** No price charts, "buy now" wording or return claims. The call to action is
   "View on vibe/vibe". Keep the testnet notice.
8. **User content is untrusted.** Config values go through the Zod schemas in `src/lib/config.ts` and
   are rendered as text or through `<Markdown>`. Never use `dangerouslySetInnerHTML` with user content.
   Links must be `https:`. Images use `<SafeImage>`.
9. **No third-party scripts, trackers or brand assets.** Fonts come from `next/font` only. Never use
   vibe/vibe's logo, wordmark, mascots or NFT art.
10. **Do not present unverified things as fact.** See `PLATFORM.unverified` in
    `src/config/platform.ts`: no bonding or graduation state, no curve progress, no guessing which
    holder is the curve or pool, and never call a holder a "whale" or "team".

## How it is built

One Next.js app (App Router, TypeScript strict, Tailwind CSS v4) with two modes, chosen by
`getSiteMode()` in `src/config/site.ts`:

- **Kit mode** (`NEXT_PUBLIC_LIFTOFF_CONFIG` unset or invalid): Liftoff's own site.
- **Project mode** (variable valid): the builder's site, rendered from the config plus live data.

| Path | What lives there |
| --- | --- |
| `src/app/page.tsx` | `/` for both modes; picks the mode and renders the right home |
| `src/app/(kit)/` | Kit-only routes: `/setup`, `/guide`, `/showcase`, `/demo` |
| `src/app/(project)/` | Project-only routes: `/holders` |
| `src/app/api/holders/route.ts` | The holder gate (the only API route) |
| `src/app/og/route.tsx` | Open Graph image |
| `src/app/globals.css` | Design tokens (colours as CSS variables) and shared classes |
| `src/components/project/` | Project page: `ProjectView.tsx` (the three looks), `blocks.tsx` (shared parts) |
| `src/components/wizard/` | Setup wizard and its draft model |
| `src/components/wallet/` | Wallet provider and the holder-area state machine |
| `src/config/chain.ts`, `platform.ts` | Verified network and platform values, with `source` and `verifiedOn` |
| `src/config/site.ts` | Name, labels, repository link, mode detection, Deploy Button link |
| `src/lib/config.ts` | Config schemas, `encodeConfig`, `decodeConfig`, `migrateConfig` |
| `src/lib/explorer.ts` | Explorer client (cached 60 s, never throws) |
| `src/lib/gate.ts` | Server-only gate logic |
| `src/lib/siwe.ts` | The sign-in message: built in the browser, parsed strictly on the server |
| `src/lib/token.ts`, `format.ts` | Read-only ERC-20 calls and bigint formatting |
| `src/lib/markdown.ts` | Small sanitising Markdown parser |
| `e2e/` | Playwright tests; `e2e/support/` mocks the explorer and RPC |
| `prompts/` | Copy-paste recipes for common customisations |

Conventions: token amounts are always `bigint` (never floating point); colours come from the CSS
variables, not hard-coded values; pages must work at 360px wide, by keyboard, and with reduced motion.

## Changing the config format

If you add a field, add it to the schema in `src/lib/config.ts` as optional so existing strings keep
working. If a change is not backward compatible, bump `CONFIG_VERSION` and add a step to
`migrateConfig`. Update the wizard draft (`src/components/wizard/draft.ts`) and the tests.

## Checks to run before finishing

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For changes to pages, the wizard or the gate, also run `pnpm test:e2e` and `pnpm check:leak` (first
time only: `pnpm exec playwright install chromium`). All of them must pass with no warnings.
