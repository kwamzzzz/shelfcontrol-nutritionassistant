import * as React from "react";

export type ShellMode = "phone" | "tablet" | "desktop";

// Content/layout breakpoints — see the mobile-optimization brief "Responsive layout contract".
const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;
// A coarse-pointer viewport shorter than this is treated as a phone even when it is wide
// (e.g. a landscape iPhone that exceeds 768px width but has very little height).
const SHORT_LANDSCAPE_MAX_HEIGHT = 600;

function computeShellMode(): ShellMode {
  if (typeof window === "undefined") return "desktop";
  const { innerWidth: w, innerHeight: h } = window;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const shortCoarseLandscape = coarse && h < SHORT_LANDSCAPE_MAX_HEIGHT;
  if (w < TABLET_MIN || shortCoarseLandscape) return "phone";
  if (w < DESKTOP_MIN) return "tablet";
  return "desktop";
}

/**
 * Single source of truth for the responsive shell: "phone" | "tablet" | "desktop".
 *
 * Driven by matchMedia rather than a continuous resize listener, so it only recomputes
 * when a relevant width/height threshold, pointer type, or orientation actually changes.
 * Mount-safe: initial value is computed synchronously and guards against a missing window.
 */
export function useShellMode(): ShellMode {
  const [mode, setMode] = React.useState<ShellMode>(computeShellMode);

  React.useEffect(() => {
    const update = () => setMode(computeShellMode());
    const queries = [
      `(min-width: ${TABLET_MIN}px)`,
      `(min-width: ${DESKTOP_MIN}px)`,
      `(min-height: ${SHORT_LANDSCAPE_MAX_HEIGHT}px)`,
      "(pointer: coarse)",
      "(orientation: landscape)",
    ].map((q) => window.matchMedia(q));
    queries.forEach((mql) => mql.addEventListener("change", update));
    update();
    return () => queries.forEach((mql) => mql.removeEventListener("change", update));
  }, []);

  return mode;
}

export const useIsPhone = () => useShellMode() === "phone";
export const useIsDesktop = () => useShellMode() === "desktop";
