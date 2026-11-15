# Recipe: add a team section

Paste this into your AI coding agent after filling in the brackets.

---

Add a "Team" section to my Liftoff project page.

Team members (name, role, optional https link):

- [Name], [role], [https://link or none]
- [Name], [role], [https://link or none]

## How to do it

- Add a new optional section type `team` to the section schema in `src/lib/config.ts`: a title plus up to 6 members, each with a `name`, a `role` and an optional https `url`. Use the same `text(...)` and `httpsUrl` helpers as the other sections so lengths are capped and links must be https. It must be optional so existing config strings keep working.
- Render it in `SectionBlock` in `src/components/project/blocks.tsx`, as plain text. Show the note "Team details are provided by the project's creator and are not verified." under the list.
- Add it to the wizard: the draft types and conversions in `src/components/wizard/draft.ts`, and the form in `SectionsStep` in `src/components/wizard/Wizard.tsx`.
- Add unit tests in `src/lib/__tests__/config.test.ts` for a valid team section, a non-https link, and too many members.
- Do not label anyone in the token holder table as "team". The holder table stays as it is.

## What must not change

- Keep the footer label ("Made with Liftoff, an unofficial community kit…") and the testnet notice exactly as they are.
- Keep the full contract address on the home page, with its copy button, explorer link and the line "Verify this address before you trust any site."
- Keep "View on vibe/vibe" as the call to action. Do not add price charts, "buy now" wording or promises of returns.
- Do not add any code that sends a transaction or asks a wallet for an approval, permit or typed-data signature. The only signature is the existing holder sign-in.
- Do not touch `src/lib/gate.ts`, `src/lib/siwe.ts` or `src/app/api/holders/route.ts`, and do not add environment variables.
- Do not add third-party scripts, trackers, or vibe/vibe logos or artwork.

## Finish

Read `CLAUDE.md` first and follow it. When you are done, run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`, fix anything that fails, and tell me in plain language what you changed and which files.
