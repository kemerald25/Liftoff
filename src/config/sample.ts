import { KIT } from "@/config/site";

/**
 * Sample content for the built-in demo, the wizard's "Load the sample"
 * button and `.env.example`. The token is an arbitrary testnet example,
 * not an endorsement, and this sample is not run by that token's creator.
 */
export const SAMPLE_CONFIG = {
  v: 1,
  token: KIT.sampleToken,
  look: "product",
  name: "Liftoff sample project",
  tagline: "A sample project page built with Liftoff, using an arbitrary testnet token.",
  description:
    "This page shows what a **Liftoff** site looks like. The token below is an arbitrary testnet example. It is not an endorsement, and this sample is not run by the token's creator.\n\nEverything you see comes from two places:\n\n- the token's contract address, read live from the explorer\n- a short config string made in the setup wizard",
  links: {
    demo: KIT.preflightUrl,
    repo: KIT.repoUrl,
  },
  sections: [
    {
      type: "features",
      title: "What visitors can try",
      items: [
        { title: "Check the address", text: "The full contract address is always shown, with copy and explorer links." },
        { title: "See live token data", text: "Supply, holders and transfers come from the explorer, cached for a minute." },
        { title: "Open the holder area", text: "Holders unlock extra content with a free sign-in. No transaction, ever." },
      ],
    },
    {
      type: "faq",
      items: [
        { q: "Is this an official vibe/vibe page?", a: "No. Liftoff is an unofficial community kit, and each site is run by its own creator." },
        { q: "Does this site ask me to pay or trade?", a: "No. It never sends a transaction. The only wallet prompt is a free sign-in for the holder area." },
      ],
    },
  ],
  gate: {
    minTokens: "1000",
    title: "Holder notes",
    teaser: "Holders of at least 1,000 tokens can read the sample holder notes.",
  },
} as const;

export const SAMPLE_HOLDER_CONTENT = {
  v: 1,
  body: "## Welcome, holder\n\nThis is sample holder content. On a real site, the creator writes this in the setup wizard.\n\nRemember: holders can copy and share anything shown here, so it should never contain secrets.",
  links: [{ label: "Liftoff source code", url: KIT.repoUrl }],
} as const;
