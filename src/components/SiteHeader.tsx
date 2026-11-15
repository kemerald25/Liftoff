"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export type NavLink = { href: string; label: string };

/**
 * Header shared by both modes. It stays fixed to the top of the screen
 * while the page scrolls. On small screens the links collapse into a
 * hamburger menu; on larger screens they sit in the bar.
 */
export function SiteHeader({ brand, links }: { brand: ReactNode; links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="wrap flex items-center justify-between gap-3 py-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-mono text-lg font-bold text-text no-underline"
          onClick={() => setOpen(false)}
        >
          {brand}
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <nav aria-label="Main" className="hidden items-center gap-4 font-mono text-sm sm:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <button
            type="button"
            className="btn btn-small sm:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            data-testid="menu-button"
            onClick={() => setOpen((current) => !current)}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {open ? <path d="M3 3l10 10M13 3L3 13" /> : <path d="M2 4h12M2 8h12M2 12h12" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav id={menuId} aria-label="Main menu" className="border-t border-line bg-bg sm:hidden" data-testid="mobile-menu">
          <ul className="wrap flex flex-col py-2 font-mono text-base">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block py-3" onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
