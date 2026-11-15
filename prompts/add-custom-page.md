# Recipe: add a custom page

Paste this into your AI coding agent after filling in the brackets.

---

Add a new page to my Liftoff project site.

- Page address: [e.g. /about]
- Page title: [e.g. About the project]
- Content: [paste or describe the text]

## How to do it

- Create the page under `src/app/(project)/`, for example `src/app/(project)/about/page.tsx`. Pages in that folder automatically get the project header and the required footer, and only exist when the site has a valid config.
- Export `metadata` with the page title.
- Use the existing classes from `src/app/globals.css` (`wrap`, `panel`, `label`, `btn`, `note`) and the colour variables. Do not hard-code colours.
- Add a link to the new page in the navigation in `src/components/project/ProjectShell.tsx`.
- The page must work at 360px wide, by keyboard only, and have one `<h1>`.
- Write the content directly in the page as text. Do not add a way for visitors to submit anything.
- Add a Playwright check in `e2e/project.spec.ts` that the page renders and still shows the footer label.

## What must not change

- Keep the footer label ("Made with Liftoff, an unofficial community kit…") and the testnet notice exactly as they are.
- Keep the full contract address on the home page, with its copy button, explorer link and the line "Verify this address before you trust any site."
- Keep "View on vibe/vibe" as the call to action. Do not add price charts, "buy now" wording or promises of returns.
- Do not add any code that sends a transaction or asks a wallet for an approval, permit or typed-data signature. The only signature is the existing holder sign-in.
- Do not touch `src/lib/gate.ts`, `src/lib/siwe.ts` or `src/app/api/holders/route.ts`, and do not add environment variables.
- Do not add third-party scripts, trackers, or vibe/vibe logos or artwork.

## Finish

Read `CLAUDE.md` first and follow it. When you are done, run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`, fix anything that fails, and tell me in plain language what you changed and which files.
