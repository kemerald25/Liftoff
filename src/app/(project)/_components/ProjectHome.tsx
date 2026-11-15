import { ProjectView } from "@/components/project/ProjectView";
import type { SiteConfig } from "@/lib/config";
import { getTokenSnapshot } from "@/lib/explorer";

/** Project home: live explorer data (cached 60 seconds) plus the builder's config. */
export async function ProjectHome({
  config,
  holderAreaEnabled,
}: {
  config: SiteConfig;
  holderAreaEnabled: boolean;
}) {
  const snapshot = await getTokenSnapshot(config.token);
  return <ProjectView config={config} snapshot={snapshot} holderAreaEnabled={holderAreaEnabled} />;
}
