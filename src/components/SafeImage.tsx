"use client";

import { useState } from "react";

/**
 * Loads a builder-supplied image with a plain <img>: no referrer sent, lazy
 * loading, and a lettered tile as fallback if the image is missing or fails.
 */
export function SafeImage({
  src,
  name,
  className = "",
}: {
  src: string | undefined;
  /** Project name, used for the alt text and the fallback letter. */
  name: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const letter = Array.from(name.trim())[0]?.toUpperCase() ?? "?";

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={`${name} placeholder image`}
        className={`flex items-center justify-center bg-soft font-mono text-5xl font-bold text-accent select-none ${className}`}
      >
        <span aria-hidden="true">{letter}</span>
      </div>
    );
  }

  return (
    // A plain <img> is required here: next/image would proxy untrusted URLs through this site.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} project image`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`object-cover ${className}`}
      onError={() => setFailedSrc(src)}
    />
  );
}
