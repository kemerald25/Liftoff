"use client";

import dynamic from "next/dynamic";

/**
 * The wizard restores its state from the URL hash, which only exists in the
 * browser, so it is rendered client-side only.
 */
const Wizard = dynamic(() => import("./Wizard"), {
  ssr: false,
  loading: () => (
    <div className="wrap py-10">
      <h1 className="text-3xl">Setup wizard</h1>
      <p className="mt-3 text-muted">Loading the wizard…</p>
    </div>
  ),
});

export function WizardLoader() {
  return <Wizard />;
}
