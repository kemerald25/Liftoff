import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { KitShell } from "@/components/kit/KitShell";
import { getSiteMode } from "@/config/site";

/** Kit-mode routes exist only when no valid site config is set. */
export default function KitLayout({ children }: { children: ReactNode }) {
  const site = getSiteMode();
  if (site.mode !== "kit") notFound();
  return <KitShell configError={site.configError}>{children}</KitShell>;
}
