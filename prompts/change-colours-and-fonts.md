# Recipe: change colours and fonts

Paste this into your AI coding agent after filling in the brackets.

---

Change the look of my Liftoff site.

- Colours I want: [describe them, e.g. "deep navy background with a warm orange accent"].
- Fonts I want: [name Google Fonts, e.g. "Space Grotesk for text, IBM Plex Mono for headings"], or "keep the current fonts".

## How to do it

- Colours are CSS variables at the top of `src/app/globals.css`. There is a dark set (`:root`) and a light set, which appears twice (once in the `prefers-color-scheme: light` block and once under `:root[data-theme="light"]`). Change both themes and keep the two light copies identical.
- Fonts are loaded in `src/app/layout.tsx` with `next/font/google`. Swap the imported fonts but keep the CSS variable names `--font-body` and `--font-heading`. Do not load fonts any other way.
- Every text and background pair must reach WCAG AA contrast (4.5:1 for normal text). Check `--text`, `--body`, `--muted` and `--accent` against `--bg`, `--surface` and `--panel`, and `--accent-ink` against `--accent`, in both themes. Tell me the ratios.
- If you change the default accent, also update the fallback colours in `src/lib/accent.ts`, `src/lib/format.ts` (`THEME_BACKGROUNDS`) and `src/app/og/route.tsx`, and the tests that mention them.

## What must not change

- Keep the footer label ("Made with Liftoff, an unofficial community kit…") and the testnet notice exactly as they are.
- Keep the full contract address on the home page, with its copy button, explorer link and the line "Verify this address before you trust any site."
- Keep "View on vibe/vibe" as the call to action. Do not add price charts, "buy now" wording or promises of returns.
- Do not add any code that sends a transaction or asks a wallet for an approval, permit or typed-data signature. The only signature is the existing holder sign-in.
- Do not touch `src/lib/gate.ts`, `src/lib/siwe.ts` or `src/app/api/holders/route.ts`, and do not add environment variables.
- Do not add third-party scripts, trackers, or vibe/vibe logos or artwork.

## Finish

Read `CLAUDE.md` first and follow it. When you are done, run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`, fix anything that fails, and tell me in plain language what you changed and which files.
