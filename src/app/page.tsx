import { KitShell } from "@/components/kit/KitShell";
import { ProjectShell } from "@/components/project/ProjectShell";
import { getSiteMode } from "@/config/site";
import { isHolderAreaEnabled } from "@/lib/gate";
import { KitHome } from "./(kit)/_components/KitHome";
import { ProjectHome } from "./(project)/_components/ProjectHome";

/**
 * The one route both modes share. Two route groups cannot both own "/", so
 * this page picks the mode and renders the matching home inside its shell.
 */
export const revalidate = 60;

export default function HomePage() {
  const site = getSiteMode();
  if (site.mode === "kit") {
    return (
      <KitShell configError={site.configError}>
        <KitHome />
      </KitShell>
    );
  }
  const holderAreaEnabled = isHolderAreaEnabled(site.config);
  return (
    <ProjectShell config={site.config} holderAreaEnabled={holderAreaEnabled}>
      <ProjectHome config={site.config} holderAreaEnabled={holderAreaEnabled} />
    </ProjectShell>
  );
}
