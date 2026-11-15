import type { Metadata } from "next";
import Link from "next/link";
import { ProjectView } from "@/components/project/ProjectView";
import { SAMPLE_CONFIG } from "@/config/sample";
import { validateConfig } from "@/lib/config";
import { getTokenSnapshot } from "@/lib/explorer";

export const metadata: Metadata = { title: "Live demo" };
export const revalidate = 60;

export default async function DemoPage() {
  const sample = validateConfig(SAMPLE_CONFIG);
  if (!sample.ok) throw new Error(`Sample config is invalid: ${sample.error}`);
  const snapshot = await getTokenSnapshot(sample.value.token);
  return (
    <>
      <div className="border-b border-line bg-surface">
        <p className="wrap py-3 text-sm text-text">
          <strong>Demo.</strong> This is how a Liftoff project site looks, with live data for an arbitrary
          testnet token. It is an example, not an endorsement, and is not run by the token&apos;s creator.{" "}
          <Link href="/setup">Make your own</Link>.
        </p>
      </div>
      <ProjectView config={sample.value} snapshot={snapshot} holderAreaEnabled={false} preview />
    </>
  );
}
