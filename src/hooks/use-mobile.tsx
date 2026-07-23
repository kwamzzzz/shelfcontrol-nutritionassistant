import { useShellMode } from "@/hooks/use-shell-mode";

/**
 * Retained for the shadcn ui/sidebar primitive, which imports `useIsMobile`.
 * The app shell now uses `useShellMode()` as the single source of truth, so
 * "mobile" here means the phone shell mode — reconciling the previously
 * conflicting 640px / 768px / 1024px breakpoints onto one definition.
 */
export function useIsMobile() {
  return useShellMode() === "phone";
}
