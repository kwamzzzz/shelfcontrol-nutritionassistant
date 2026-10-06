import type { FeedbackRow } from "@/hooks/useFeedback";
import { statusLabel } from "@/lib/feedback-status";

/** A brief to paste into a build session: everything needed to act on it. */
export function taskBrief(f: FeedbackRow, sender: string): string {
  const c = f.context ?? {};
  const visits = (c.visits ?? []).map((v) => v.screen || v.route).join(" → ");
  return [
    `Shelf Control feedback (${f.category}, ${statusLabel(f.status)}) from ${sender}, ${f.created_at.slice(0, 10)}`,
    `Screen: ${f.screen || "(not recorded)"} (${f.page_path ?? ""})`,
    f.target ? `Pointed at: ${f.target.label}\nSelector: ${f.target.selector}` : "",
    f.rating != null ? `Rating: ${f.rating}/5` : "",
    "",
    f.message,
    "",
    c.window ? `Window ${c.window.width}×${c.window.height}, ${c.browser ?? ""}` : "",
    visits ? `Came through: ${visits}` : "",
    c.errors?.length ? `Recent errors:\n${c.errors.map((e) => `- ${e.message}`).join("\n")}` : "",
    f.screenshot_path ? "A screenshot is attached to the feedback in Admin." : "",
  ]
    .filter((line, i, all) => line !== "" || (all[i - 1] !== "" && i > 0))
    .join("\n")
    .trim();
}
