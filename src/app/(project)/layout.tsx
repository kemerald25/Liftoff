import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ProjectShell } from "@/components/project/ProjectShell";
import { getSiteMode } from "@/config/site";
import { isHolderAreaEnabled } from "@/lib/gate";

/** Project-mode routes exist only when a valid site config is set. */
export default function ProjectLayout({ children }: { children: ReactNode }) {
  const site = getSiteMode();
  if (site.mode !== "project") notFound();
  return (
    <ProjectShell config={site.config} holderAreaEnabled={isHolderAreaEnabled(site.config)}>
      {children}
    </ProjectShell>
  );
}
