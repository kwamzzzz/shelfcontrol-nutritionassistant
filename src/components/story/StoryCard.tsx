import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/use-count-up";
import { StoryArt, type StoryArtName } from "@/components/story/StoryArt";

export type StoryTone = "neutral" | "success" | "warning";

const VALUE_TONE: Record<StoryTone, string> = {
  neutral: "text-foreground",
  success: "text-success",
  warning: "text-warning",
};

interface StoryCardProps {
  /** Short descriptive label above the figure. */
  label: string;
  /** The dominant figure. Counts up when numeric; omit when using `display`. */
  value?: number | null;
  /** A pre-formatted figure for anything that is not a plain number. */
  display?: string;
  /** Formats the counting value. Defaults to a rounded, grouped integer. */
  format?: (n: number) => string;
  /** Supporting context under the figure. */
  context?: string | null;
  art: StoryArtName;
  tone?: StoryTone;
  span?: "half" | "full";
  /** The single sentence a screen reader hears in place of the visual card. */
  a11yLabel: string;
}

export function StoryCard({
  label,
  value,
  display,
  format = (n) => Math.round(n).toLocaleString(),
  context,
  art,
  tone = "neutral",
  span = "half",
  a11yLabel,
}: StoryCardProps) {
  const counted = useCountUp<HTMLParagraphElement>(typeof value === "number" ? value : 0);
  const figure = display ?? format(counted.value);

  // Names and stores run long ("Red Kidney Beans (Farm Fresh)"), so the figure
  // steps down rather than bursting out of a narrow phone card.
  const size =
    span === "full"
      ? figure.length > 14
        ? "text-[1.5rem]"
        : figure.length > 8
          ? "text-[2rem]"
          : "text-[2.5rem]"
      : figure.length > 11
        ? "text-[1.125rem]"
        : figure.length > 6
          ? "text-[1.5rem]"
          : "text-[2rem]";

  return (
    <div
      role="group"
      className={cn(
        "surface-panel relative isolate flex min-h-[168px] flex-col justify-between overflow-hidden rounded-3xl p-4",
        span === "full" ? "col-span-2 md:col-span-3" : "col-span-1",
      )}
    >
      <p className="sr-only">{a11yLabel}</p>

      <div aria-hidden="true" className="flex h-full flex-col justify-between gap-3">
        <p className="text-[13px] font-medium leading-snug text-muted-foreground">{label}</p>

        <div className="relative z-10 mt-auto">
          <p
            ref={counted.ref}
            className={cn(
              "line-clamp-3 font-[Outfit,sans-serif] font-semibold leading-[1.05] tracking-tight tabular-nums",
              size,
              VALUE_TONE[tone],
            )}
          >
            {figure}
          </p>
          {context && (
            <p
              className={cn(
                "mt-1.5 text-xs leading-snug text-muted-foreground",
                span === "full" ? "max-w-[78%]" : "max-w-[72%]",
              )}
            >
              {context}
            </p>
          )}
        </div>

        <StoryArt
          name={art}
          tone={tone === "warning" ? "warning" : "primary"}
          className={cn(
            "absolute -bottom-3 -right-4 -z-10 h-[78px] w-auto opacity-70",
            span === "full" && "-right-2 h-[100px] opacity-80",
          )}
        />
      </div>
    </div>
  );
}

interface StoryChapterProps {
  kicker: string;
  title: string;
  children: ReactNode;
}

export function StoryChapter({ kicker, title, children }: StoryChapterProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="font-analytics text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {kicker}
        </p>
        <h2 className="font-[Outfit,sans-serif] text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{children}</div>
    </section>
  );
}
