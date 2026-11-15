import Link from "next/link";
import { KitShell } from "@/components/kit/KitShell";
import { ProjectShell } from "@/components/project/ProjectShell";
import { getSiteMode } from "@/config/site";
import { isHolderAreaEnabled } from "@/lib/gate";

/** 404 page, shown inside the shell of whichever mode is active so the labels stay on show. */
export default function NotFound() {
  const site = getSiteMode();
  const body = (
    <div className="wrap py-20">
      <p className="label">404</p>
      <h1 className="mt-2 text-3xl">This page does not exist</h1>
      <p className="mt-3">The link may be old, or the page may not be part of this site.</p>
      <Link href="/" className="btn mt-6">
        Back to the home page
      </Link>
    </div>
  );
  if (site.mode === "kit") return <KitShell configError={site.configError}>{body}</KitShell>;
  return (
    <ProjectShell config={site.config} holderAreaEnabled={isHolderAreaEnabled(site.config)}>
      {body}
    </ProjectShell>
  );
}
