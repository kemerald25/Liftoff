"use client";

import { useRef, useState } from "react";

/** Copies text to the clipboard and confirms to sighted and screen-reader users. */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className = "btn btn-small",
  describe,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  /** What is being copied, for screen readers, e.g. "contract address". */
  describe?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button type="button" className={className} onClick={copy} disabled={value === ""}>
      {state === "copied" ? copiedLabel : state === "failed" ? "Select and copy by hand" : label}
      <span className="sr-only" role="status">
        {state === "copied" && `${describe ?? "Text"} copied`}
        {state === "failed" && "Copying failed. Select the text and copy it by hand."}
      </span>
    </button>
  );
}
