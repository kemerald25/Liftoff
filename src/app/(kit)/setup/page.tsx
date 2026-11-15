import type { Metadata } from "next";
import { WizardLoader } from "@/components/wizard/WizardLoader";

export const metadata: Metadata = {
  title: "Setup wizard",
  description: "Make the config for your Liftoff project site. Runs entirely in your browser.",
};

export default function SetupPage() {
  return (
    <>
      <noscript>
        <p className="wrap py-6">The setup wizard needs JavaScript. It runs entirely in your browser.</p>
      </noscript>
      <WizardLoader />
    </>
  );
}
