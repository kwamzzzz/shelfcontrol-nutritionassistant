/** The feedback lifecycle: new, being worked on, then done or declined. */
export type FeedbackStatus = "new" | "in_progress" | "done" | "wont_do";

export const FEEDBACK_STATUSES: { value: FeedbackStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "wont_do", label: "Won't do" },
];

export const statusLabel = (status: string) =>
  FEEDBACK_STATUSES.find((s) => s.value === status)?.label ?? status;

export const statusStyles: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/20",
  in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/20",
  done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20",
  wont_do: "bg-muted text-muted-foreground border-border",
};
