# Recipe: replace the hero layout

Paste this into your AI coding agent after filling in the brackets.

---

Change the top section (the "hero") of my Liftoff project page.

- My look is: [meme / product / rwa]
- What I want: [describe it, e.g. "image on the left, text on the right, bigger tagline"]

## How to do it

- Each look is a function in `src/components/project/ProjectView.tsx` (`MemeLook`, `ProductLook`, `RwaLook`). Change only the `<header>` of my look.
- The hero must still contain: the project name as the page's only `<h1>`, the symbol chip, the tagline, the "View on vibe/vibe" button (`ViewOnPlatform`), and the testnet notice or, for the rwa look, the disclosures panel directly below.
- Keep `AddressCard` on the page, no lower than third in the order of blocks.
- Use `SafeImage` for the image. Do not switch to another image component or add a background video.
- It must look right at 360px wide and on desktop, in both dark and light themes. Animation is fine only if it is switched off under `prefers-reduced-motion`.
- Run `pnpm test:e2e` as well, since those tests look for the hero's contents.

## What must not change

- Keep the footer label ("Made with Liftoff, an unofficial community kit…") and the testnet notice exactly as they are.
- Keep the full contract address on the home page, with its copy button, explorer link and the line "Verify this address before you trust any site."
- Keep "View on vibe/vibe" as the call to action. Do not add price charts, "buy now" wording or promises of returns.
- Do not add any code that sends a transaction or asks a wallet for an approval, permit or typed-data signature. The only signature is the existing holder sign-in.
- Do not touch `src/lib/gate.ts`, `src/lib/siwe.ts` or `src/app/api/holders/route.ts`, and do not add environment variables.
- Do not add third-party scripts, trackers, or vibe/vibe logos or artwork.

## Finish

Read `CLAUDE.md` first and follow it. When you are done, run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`, fix anything that fails, and tell me in plain language what you changed and which files.
