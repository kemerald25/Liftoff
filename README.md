# Liftoff

**Turn a token launched on vibe/vibe into a live project website in about five minutes, with no code editing.**

> **Unofficial community tool. Not affiliated with or endorsed by vibe/vibe.**
> Liftoff works on Robinhood Chain Testnet only. Test ETH and testnet tokens have no monetary value.
> Nothing here is financial advice.

Liftoff is a free, open-source (MIT) template. You paste your token's contract address into a setup
wizard, pick a look, write a few lines, and deploy your own copy to Vercel's free plan. You get:

- a **project page** with your content, the full contract address, and live token data
  (supply, holders, transfers, top holders) read from the public explorer
- an optional **holder area**: content that only wallets holding enough of your token can open,
  checked on the server
- three looks: **Meme & Artcoins**, **Product & Utility**, **RWA & Stocks**

Liftoff is the second tool in a small builder toolkit. The first is
[Preflight](https://preflight-sim.vercel.app), which explains your launch settings before you sign.
"Liftoff" is a placeholder name kept in one constant (`KIT.name` in `src/config/site.ts`).

## What Liftoff never does

- It never sends a transaction, and never asks for an approval, permit or typed-data signature. The
  only wallet prompts are: connect, switch or add the network, and one free plain-text sign-in for the
  holder area.
- It has no database, accounts, API keys, cookies or sessions.
- It shows no price charts, "buy now" prompts or return claims. The call to action is "View on vibe/vibe".
- It loads no trackers or third-party scripts, and uses none of vibe/vibe's logos or artwork.
- It identifies tokens by **contract address only**, never by name or symbol. Many unrelated tokens
  share the same name.

## One app, two modes

The same app behaves in one of two ways, depending on one setting:

| Mode | When | What you see |
| --- | --- | --- |
| **Kit mode** | `NEXT_PUBLIC_LIFTOFF_CONFIG` is missing or invalid | Liftoff's own site: the setup wizard, guide, demo and showcase |
| **Project mode** | `NEXT_PUBLIC_LIFTOFF_CONFIG` is valid | Your project site, built from that config plus live chain data |

If you deploy without a config you land in kit mode with a "Finish setup" banner. Nothing is broken;
the config just is not set yet.

There are exactly two environment variables:

| Variable | Required | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_LIFTOFF_CONFIG` | Yes, for project mode | The **public site config** string from the wizard |
| `LIFTOFF_HOLDER_CONTENT` | Only for a holder area | The **private holder content** string from the wizard. Server only |

## Five-minute setup

You need a free GitHub account and a free Vercel account.

1. Open the setup wizard on a hosted Liftoff site (the `/setup` page).
2. Paste your **token contract address**. The wizard checks it on the chain and shows the token's
   name, symbol and supply so you can confirm it is yours.
3. Pick a look, then add your tagline, description, links, and (if you want one) holder-area content.
   The preview updates as you type.
4. Press **Copy** next to **Public site config**. If you enabled a holder area, also press **Copy**
   next to **Private holder content**.
5. Press **Deploy to Vercel**. Vercel copies this repository into your GitHub account and shows a form.
   Paste each string into the field with the matching name, then press Deploy.

About a minute later your site is live at the address Vercel gives you.

The wizard runs entirely in your browser. What you type is never uploaded. Your public draft is kept in
the page's address (after the `#`) so a refresh does not lose it; holder content is kept only in the
open browser tab.

## Editing your site later

Your site has no admin page. To change it you make new strings and swap them in Vercel:

1. In Vercel, open your project, then **Settings**, then **Environment Variables**. Copy the current
   value of `NEXT_PUBLIC_LIFTOFF_CONFIG` (and `LIFTOFF_HOLDER_CONTENT` if you have one).
2. Open the setup wizard, press **Import config**, and paste the strings. Your content appears in the form.
3. Change what you want, then copy the new strings.
4. Back in Vercel, edit each variable, replace the old value with the new one, and save.
5. Open **Deployments**, press the three dots next to the latest deployment, and choose **Redeploy**.

Changing a variable does nothing until you redeploy. This is the step people most often miss.

For a custom domain: in Vercel open **Settings**, then **Domains**, add your domain, and add the
records Vercel shows at the place you bought the domain.

## How the holder gate works, and what it cannot prevent

The holder content is never part of your public page. It lives only in the server-only variable and is
released by one server route, `POST /api/holders`, after these checks, in order:

1. The visitor's browser builds a plain-text sign-in message in the Sign-In with Ethereum (EIP-4361)
   layout and the wallet signs it with `personal_sign`. The message states the site's domain, the
   wallet address, chain ID 46630, a timestamp and a random nonce, and says in words that it is free,
   is not a transaction and cannot move funds.
2. The server parses the message strictly and rejects anything malformed.
3. It checks the domain and origin in the message match the site that received the request, so a
   signature made for another site is useless.
4. It checks the chain ID, and that the timestamp is no more than 5 minutes old and not in the future
   (30 seconds of clock skew allowed).
5. It verifies the signature with viem's public-client `verifyMessage`, which supports smart-contract
   wallets as well as ordinary ones.
6. It reads `balanceOf` for your token from the RPC at that moment and compares it with your threshold
   using exact integer maths.
7. Only then does it return the content, with `Cache-Control: no-store`.

The gate is stateless: no cookies, no sessions, no secret key. The visitor's browser keeps unlocked
content in memory only, so a reload locks it again. Visitors below the threshold are never asked to
sign. Refusals all look the same and reveal nothing about the content. If the RPC cannot be reached,
the gate stays closed. If `LIFTOFF_HOLDER_CONTENT` is missing or invalid, the holder area is switched off.

**Be honest with yourself about the limits:**

- A holder can copy what they unlock and share it with anyone.
- Someone can buy tokens, unlock the content, then sell.
- A signed message can be reused for up to 5 minutes by whoever holds it. It only ever proves control
  of the wallet to your own site.
- The per-IP throttling is best effort. It is kept in memory, and serverless hosts run several copies.

So never put private keys, passwords, credentials or anything truly sensitive in holder content. Treat
it as a perk for holders, not a vault.

`pnpm check:leak` proves the content stays out of the public site. It builds the app with a random
sentinel in `LIFTOFF_HOLDER_CONTENT` and fails if the sentinel appears anywhere in the client bundle,
in any statically generated page, or in any public response. It also confirms that a correctly signed
request from a holder does receive it.

## Local development

Requires Node.js 20.9 or newer and pnpm.

```bash
pnpm install
```

```bash
pnpm dev
```

With no `.env.local` you get kit mode. To see project mode, copy the sample:

```bash
cp .env.example .env.local
```

The sample uses token `0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559`. It is an **arbitrary testnet
example, not an endorsement**, and the sample site is not run by that token's creator.

Checks:

| Command | What it does |
| --- | --- |
| `pnpm lint` | ESLint, no warnings allowed |
| `pnpm typecheck` | TypeScript, strict |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm build` | Production build |
| `pnpm test:e2e` | End-to-end tests (Playwright) with the explorer and RPC mocked. First run: `pnpm exec playwright install chromium` |
| `pnpm check:leak` | The holder-content leak check described above |

The end-to-end tests build three copies of the app into `.next-e2e/` (kit mode, project mode, and
project mode with the explorer down) and run them side by side. A small preload script
(`e2e/support/mock-network.cjs`) replaces the explorer and RPC for the server; the tests do the same for
the browser. App code is not changed for tests.

### Where things live

```
src/app/page.tsx      "/" for both modes (picks the mode)
src/app/(kit)/        kit-mode routes: /setup, /guide, /showcase, /demo
src/app/(project)/    project-mode routes: /holders
src/app/api/holders/  holder gate route (server only)
src/app/og/           Open Graph image route
src/components/       shared UI, looks, wizard, wallet
src/config/           chain.ts, platform.ts, site.ts, sample.ts
src/lib/              config.ts, explorer.ts, token.ts, gate.ts, siwe.ts, markdown.ts, format.ts
src/lib/__tests__/    unit tests
e2e/                  Playwright tests and network mocks
prompts/              copy-paste recipes for AI coding agents
showcase.json         sites listed on /showcase
```

### Customising with an AI coding agent

`CLAUDE.md` and `AGENTS.md` describe the architecture and the rules that must not be broken. The
`prompts/` folder has copy-paste recipes for common changes (colours and fonts, a team section, a
custom page, a contact section, a new hero layout). Each one states what must stay as it is.

## Verified facts and how to update them

Network and platform values live in two files, each with a `source` and a `verifiedOn` date:

- `src/config/chain.ts`: chain ID 46630 (`0xb626`), RPC, explorer, faucet, native currency
- `src/config/platform.ts`: vibe/vibe links, token standard and supply, category names, supported wallets

These were checked on **15 November 2026**: `eth_chainId` on the RPC returned `0xb626` with open CORS,
and the explorer's token, counters, holders and address endpoints returned the documented fields. The
Deploy Button link uses the parameters in Vercel's documentation on the same date
(`repository-url`, `env`, `envDescription`, `envLink`, `project-name`, `repository-name`).

To update a value: change it in the config file, update `verifiedOn` and `source`, and run the checks.
Nothing else in the app hard-codes these values, except the test mocks in `e2e/support/mock-data.cjs`.
To add mainnet later, add a second profile with the same shape and switch `CHAIN` and `PLATFORM` to it.
Only testnet is built today.

## Unverified items

These could not be verified, so Liftoff handles them defensively and never presents them as fact:

1. **Bonding or graduated state, and curve progress.** No verified contract ABI is available. Liftoff
   does not compute or show them, and links to the token's vibe/vibe page for market information.
2. **Which holder addresses are the curve, pool or reserve.** Entries where the explorer says
   `is_contract` is true are tagged "Contract", with a note that contracts can include the launchpad's
   curve and liquidity. No holder is ever called a "whale" or "team".
3. **The explorer's rate-limit window.** Responses are cached for 60 seconds on the server. If the
   explorer fails, the page shows the last good data it has in memory, or "Unavailable", and never crashes.
4. **Mainnet values.** Not included.
5. **Smart-contract wallet sign-in on this chain.** The gate uses viem's `verifyMessage`, which supports
   smart-contract wallets, but this was only tested with ordinary wallets against a mocked chain.

Decisions made while building, where the brief left room:

- `/` is shared by both modes, so it lives in `src/app/page.tsx` and picks the mode; the two route
  groups hold the mode-specific routes.
- Kit mode includes a built-in demo at `/demo` (the sample config with live data), so there is always
  a live demo without a second deployment.
- The wizard keeps the public draft in the URL hash, but keeps private holder text in the browser
  tab's session storage instead, so that sharing the wizard link can never share holder content.
- Vercel's Deploy Button can only prompt for required variables, so the wizard's button asks for
  `LIFTOFF_HOLDER_CONTENT` only when a holder area is enabled.
- A custom accent colour is used only in the themes (dark, light) where it reaches WCAG AA contrast.
- The gate reads the token's `decimals()` from the chain rather than assuming 18.
- The wallet connection is not remembered between page loads (no browser storage is used for it).
- The "Finish setup" banner is always shown in kit mode, because an unconfigured copy cannot tell
  whether it is the main Liftoff site or a builder's fresh deployment.

## Contributing

Issues and pull requests are welcome. Please:

- run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` (and `pnpm test:e2e` and
  `pnpm check:leak` for changes to pages, the wizard or the gate)
- keep the rules in `CLAUDE.md`: no transactions, labels stay, address stays on show, gate stays on the server
- keep new config fields optional so existing config strings keep working
- write copy in plain language, with no price talk or promises

### Showcase guidelines

`/showcase` lists sites built with Liftoff. It reads `showcase.json`. To add yours, open a pull request
that appends one entry:

```json
{
  "name": "Your project name",
  "url": "https://your-site.example",
  "token": "0xYourTokenContractAddress",
  "look": "product"
}
```

- `url` must be `https` and must be a Liftoff site that still shows the "Made with Liftoff" footer.
- `token` must be the contract address the site shows. Entries are identified by address, not name.
- `look` is `meme`, `product` or `rwa`.
- One entry per site. No price claims in the name.

**Listing is not endorsement or review.** Nobody checks listed projects beyond these rules, and every
entry is shown with its address and that note. Entries can be removed at the maintainers' discretion.

## Licence

MIT. See [LICENSE](LICENSE).
