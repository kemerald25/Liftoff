"use client";

import { useSyncExternalStore } from "react";
import { formatAgo } from "@/lib/format";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let now = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, 5000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** "updated 12 seconds ago", ticking in the browser. */
export function UpdatedAgo({ at }: { at: number }) {
  const current = useSyncExternalStore(
    subscribe,
    () => now || at,
    () => at,
  );
  return <span suppressHydrationWarning>updated {formatAgo((current - at) / 1000)}</span>;
}
