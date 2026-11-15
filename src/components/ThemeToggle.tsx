"use client";

export const THEME_STORAGE_KEY = "liftoff-theme";

/** Runs before first paint so a saved choice never flashes the other theme. */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function currentTheme(): "light" | "dark" {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeToggle() {
  function toggle() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing: the choice simply lasts for this page view.
    }
  }

  return (
    <button type="button" className="btn btn-small" onClick={toggle} aria-label="Switch between light and dark theme">
      <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.5a6.5 6.5 0 0 0 0 13z" fill="currentColor" />
      </svg>
      <span className="hidden sm:inline">Theme</span>
    </button>
  );
}
