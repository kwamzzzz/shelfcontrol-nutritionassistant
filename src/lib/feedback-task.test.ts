import { describe, expect, it } from "vitest";
import { taskBrief } from "./feedback-task";
import type { FeedbackRow } from "@/hooks/useFeedback";

const row: FeedbackRow = {
  id: "1",
  user_id: "u",
  category: "bug",
  rating: 2,
  message: "The add button does nothing.",
  page_path: "/pantry",
  screen: "Pantry",
  target: {
    kind: "element",
    label: "Button ‘Add item’ on Pantry",
    selector: "main > button",
    rect: { x: 0, y: 0, width: 10, height: 10 },
    viewport: { width: 1440, height: 900 },
  },
  context: {
    window: { width: 1440, height: 900 },
    browser: "Chrome 140 on macOS",
    visits: [
      { at: "", route: "/", screen: "Dashboard" },
      { at: "", route: "/pantry", screen: "Pantry" },
    ],
    errors: [{ at: "", message: "Boom" }],
  },
  screenshot_path: null,
  status: "new",
  admin_notes: null,
  status_changed_at: null,
  replied_at: null,
  created_at: "2026-10-06T10:00:00Z",
};

describe("taskBrief", () => {
  it("carries the screen, the pick, the words and the context", () => {
    const brief = taskBrief(row, "kwame@example.com");
    expect(brief).toContain("Screen: Pantry (/pantry)");
    expect(brief).toContain("Pointed at: Button ‘Add item’ on Pantry");
    expect(brief).toContain("Rating: 2/5");
    expect(brief).toContain("The add button does nothing.");
    expect(brief).toContain("Came through: Dashboard → Pantry");
    expect(brief).toContain("- Boom");
    expect(brief).not.toMatch(/\n\n\n/);
  });
});
