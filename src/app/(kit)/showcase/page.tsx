import type { Metadata } from "next";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { explorerTokenUrl } from "@/config/chain";
import { PLATFORM } from "@/config/platform";
import { KIT } from "@/config/site";
import { isHttpsUrl } from "@/lib/config";
import entries from "../../../../showcase.json";

export const metadata: Metadata = { title: "Showcase" };

const entrySchema = z.object({
  name: z.string().trim().min(1).max(40),
  url: z.string().refine(isHttpsUrl),
  token: z
    .string()
    .refine((value) => isAddress(value))
    .transform((value) => getAddress(value)),
  look: z.enum(["meme", "product", "rwa"]),
});

export default function ShowcasePage() {
  // Bad entries are skipped rather than breaking the page.
  const sites = (entries as unknown[]).flatMap((entry) => {
    const parsed = entrySchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });

  return (
    <div className="wrap max-w-3xl space-y-6 py-10 sm:py-14">
      <h1 className="text-3xl">Showcase</h1>
      <p>Sites that builders made with {KIT.name} and chose to list here.</p>
      <p className="panel text-sm text-text">
        <strong>Listing is not endorsement or review.</strong> Nobody at {KIT.name} or {PLATFORM.name} has
        checked these projects. Each site is run by its own creator. Always verify the contract address
        yourself.
      </p>
      {sites.length === 0 ? (
        <p className="note">No sites are listed yet. Yours could be the first.</p>
      ) : (
        <ul className="space-y-3">
          {sites.map((site) => (
            <li key={`${site.token}-${site.url}`} className="panel">
              <h2 className="text-lg">
                <a href={site.url} target="_blank" rel="noopener noreferrer nofollow">
                  {site.name}
                </a>
              </h2>
              <p className="label mt-1">{PLATFORM.categories[site.look]}</p>
              <p className="mt-2 font-mono text-sm break-all text-text">{site.token}</p>
              <p className="mt-1 text-sm">
                <a href={explorerTokenUrl(site.token)} target="_blank" rel="noopener noreferrer">
                  Check this address in the explorer
                </a>
              </p>
              <p className="note mt-2">Listed by its creator. Not endorsed or reviewed.</p>
            </li>
          ))}
        </ul>
      )}
      <section aria-labelledby="add-yours" className="space-y-2">
        <h2 id="add-yours" className="text-xl">
          Add your site
        </h2>
        <p className="text-sm">
          Open a pull request on <a href={KIT.repoUrl}>the {KIT.name} repository</a> that adds one entry to{" "}
          <code className="font-mono text-text">showcase.json</code> with your site&apos;s name, its https
          link, the token contract address and the look you chose. The README lists the rules.
        </p>
      </section>
    </div>
  );
}
