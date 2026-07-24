import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Decorative artwork for the Kitchen Story cards.
 *
 * Drawn inline from CSS tokens rather than shipped as bitmaps, so every piece
 * re-tints itself in light and dark and costs nothing to download. Purely
 * decorative — always hidden from assistive technology.
 */

export type StoryArtName =
  | "pantry"
  | "sprout"
  | "basket"
  | "cookbook"
  | "rhythm"
  | "clock"
  | "badge"
  | "home";

export type StoryArtTone = "primary" | "warning" | "accent";

const TONE_VAR: Record<StoryArtTone, string> = {
  primary: "var(--primary)",
  warning: "var(--warning)",
  accent: "var(--success)",
};

interface StoryArtProps {
  name: StoryArtName;
  tone?: StoryArtTone;
  className?: string;
}

export function StoryArt({ name, tone = "primary", className }: StoryArtProps) {
  const uid = useId().replace(/:/g, "");
  const glow = `story-glow-${uid}`;
  const wash = `story-wash-${uid}`;
  const c = `hsl(${TONE_VAR[tone]})`;
  const soft = (alpha: number) => `hsl(${TONE_VAR[tone]} / ${alpha})`;

  return (
    <svg
      viewBox="0 0 120 90"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none select-none", className)}
    >
      <defs>
        <radialGradient id={glow} cx="50%" cy="45%" r="62%">
          <stop offset="0%" stopColor={c} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={wash} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.85" />
          <stop offset="100%" stopColor={c} stopOpacity="0.45" />
        </linearGradient>
      </defs>

      <rect width="120" height="90" fill={`url(#${glow})`} />

      {name === "pantry" && (
        <>
          <rect x="14" y="64" width="92" height="5" rx="2.5" fill={soft(0.3)} />
          <rect x="26" y="30" width="17" height="6" rx="3" fill={c} />
          <rect x="24" y="36" width="21" height="28" rx="6" fill={`url(#${wash})`} />
          <rect x="53" y="21" width="18" height="6" rx="3" fill={c} />
          <rect x="51" y="27" width="22" height="37" rx="7" fill={soft(0.45)} />
          <rect x="82" y="40" width="15" height="6" rx="3" fill={c} />
          <rect x="80" y="46" width="19" height="18" rx="5" fill={soft(0.65)} />
          <circle cx="34" cy="49" r="3.5" fill="hsl(var(--card))" fillOpacity="0.45" />
          <circle cx="62" cy="42" r="4" fill="hsl(var(--card))" fillOpacity="0.4" />
        </>
      )}

      {name === "sprout" && (
        <>
          <ellipse cx="60" cy="73" rx="33" ry="6" fill={soft(0.18)} />
          <path d="M60 73V33" stroke={c} strokeWidth="3.5" strokeLinecap="round" />
          <path
            d="M60 54c-12 0-20-7-22-16 12-2 20 4 22 16Z"
            fill={soft(0.55)}
          />
          <path
            d="M60 45c12 0 20-7 22-16-12-2-20 4-22 16Z"
            fill={`url(#${wash})`}
          />
          <circle cx="60" cy="29" r="4" fill={c} />
        </>
      )}

      {name === "basket" && (
        <>
          <circle cx="51" cy="39" r="8" fill={soft(0.75)} />
          <circle cx="68" cy="37" r="9.5" fill={soft(0.45)} />
          <path
            d="M45 41a15 15 0 0 1 30 0"
            stroke={soft(0.55)}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M29 44h62l-7 30a5 5 0 0 1-5 4H41a5 5 0 0 1-5-4L29 44Z"
            fill={`url(#${wash})`}
          />
          <path d="M47 52l3 22M73 52l-3 22" stroke="hsl(var(--card))" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {name === "cookbook" && (
        <>
          <path
            d="M60 32c-9-6-22-8-34-6v42c12-2 25 0 34 6V32Z"
            fill={soft(0.4)}
          />
          <path
            d="M60 32c9-6 22-8 34-6v42c-12-2-25 0-34 6V32Z"
            fill={`url(#${wash})`}
          />
          <path d="M60 32v42" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M35 40h14M35 49h14M71 40h14M71 49h14"
            stroke="hsl(var(--card))"
            strokeOpacity="0.4"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}

      {name === "rhythm" && (
        <>
          <rect x="20" y="54" width="12" height="20" rx="5" fill={soft(0.35)} />
          <rect x="38" y="44" width="12" height="30" rx="5" fill={soft(0.5)} />
          <rect x="56" y="50" width="12" height="24" rx="5" fill={soft(0.65)} />
          <rect x="74" y="36" width="12" height="38" rx="5" fill={`url(#${wash})`} />
          <rect x="92" y="46" width="12" height="28" rx="5" fill={soft(0.5)} />
          <circle cx="80" cy="26" r="4.5" fill={c} />
        </>
      )}

      {name === "clock" && (
        <>
          <circle cx="60" cy="50" r="25" fill={soft(0.16)} />
          <circle cx="60" cy="50" r="25" stroke={soft(0.55)} strokeWidth="3.5" />
          <path d="M60 34v16l11 7" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="60" cy="50" r="3" fill={c} />
        </>
      )}

      {name === "badge" && (
        <>
          <path d="M48 58l-8 22 14-6 6 12 8-26-20-2Z" fill={soft(0.35)} />
          <path d="M72 58l8 22-14-6-6 12-8-26 20-2Z" fill={soft(0.5)} />
          <circle cx="60" cy="40" r="23" fill={soft(0.18)} />
          <circle cx="60" cy="40" r="23" stroke={soft(0.5)} strokeWidth="3" />
          <circle cx="60" cy="40" r="14" fill={`url(#${wash})`} />
          <path
            d="M54 40l4 4 8-8"
            stroke="hsl(var(--card))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {name === "home" && (
        <>
          <path
            d="M28 52 60 26l32 26"
            stroke={c}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M38 52h44v24a4 4 0 0 1-4 4H42a4 4 0 0 1-4-4V52Z" fill={`url(#${wash})`} />
          <circle cx="52" cy="64" r="5" fill="hsl(var(--card))" fillOpacity="0.5" />
          <circle cx="68" cy="64" r="5" fill="hsl(var(--card))" fillOpacity="0.35" />
        </>
      )}
    </svg>
  );
}
