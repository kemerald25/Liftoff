# Recipe: add an email-free contact section

Paste this into your AI coding agent after filling in the brackets.

---

Add a "Contact" section to my Liftoff project page. I do not want a contact form or an email service.

Ways to reach me (https links only):

- [Label, e.g. "Telegram group"]: [https://…]
- [Label]: [https://…]

## How to do it

- Add a `Contact` component to `src/components/project/blocks.tsx` that shows a heading, one sentence and the links as buttons, using `ExternalLink` so they open safely in a new tab.
- Render it in all three looks in `src/components/project/ProjectView.tsx`, just above `MarketNote`.
- If my links are already in the config (website, X, Telegram, Discord), reuse `config.links` instead of hard-coding them.
- Do not add a form, a `mailto:` link that exposes an email address unless I gave you one, a database, an API route, or any third-party service. Liftoff has no server storage on purpose.
- Add the sentence "The project's creator runs these channels. Liftoff does not monitor them."

## What must not change

- Keep the footer label ("Made with Liftoff, an unofficial community kit…") and the testnet notice exactly as they are.
- Keep the full contract address on the home page, with its copy button, explorer link and the line "Verify this address before you trust any site."
- Keep "View on vibe/vibe" as the call to action. Do not add price charts, "buy now" wording or promises of returns.
- Do not add any code that sends a transaction or asks a wallet for an approval, permit or typed-data signature. The only signature is the existing holder sign-in.
- Do not touch `src/lib/gate.ts`, `src/lib/siwe.ts` or `src/app/api/holders/route.ts`, and do not add environment variables.
- Do not add third-party scripts, trackers, or vibe/vibe logos or artwork.

## Finish

Read `CLAUDE.md` first and follow it. When you are done, run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`, fix anything that fails, and tell me in plain language what you changed and which files.
