/**
 * "Point at it": the page under a crosshair, the thing beneath the pointer
 * outlined, a click or tap to choose it, or a drag to box an area. What is
 * chosen is named the way a person would say it, so the report says exactly
 * which part of the screen it is about. Pointer events, so a finger works the
 * same as a mouse.
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { describe, selectorFor, type FeedbackTarget } from "@/lib/feedback-capture";

/** The part a person means: the button, not the icon inside it. */
const MEANINGFUL =
  "button, a, input, select, textarea, label, [role], [aria-label], h1, h2, h3, h4, th, td, tr, li, article, img";

function pick(x: number, y: number): Element | null {
  const hit = document
    .elementsFromPoint(x, y)
    .find(
      (e) =>
        !e.closest("[data-feedback-ui]") && e !== document.documentElement && e !== document.body,
    );
  if (!hit) return null;
  const near = hit.closest(MEANINGFUL);
  // Only climb a little way: a whole panel is rarely what was meant.
  if (near && near.contains(hit)) {
    let depth = 0;
    for (let n: Element | null = hit; n && n !== near; n = n.parentElement) depth++;
    if (depth <= 4) return near;
  }
  return hit;
}

const rectOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
};

const FeedbackPicker = ({
  screen,
  onPick,
  onCancel,
}: {
  screen: string;
  onPick: (target: FeedbackTarget) => void;
  onCancel: () => void;
}) => {
  const [hover, setHover] = useState<{ rect: FeedbackTarget["rect"]; label: string } | null>(null);
  const [box, setBox] = useState<FeedbackTarget["rect"] | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  // The dialog this opens from makes the page ignore the pointer until its
  // closing animation ends, which hides everything from elementsFromPoint. A
  // quick tap could land in that gap, so the page is made pickable at once.
  useEffect(() => {
    document.body.style.pointerEvents = "auto";
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

  const move = (e: PointerEvent) => {
    if (start.current) {
      const x = Math.min(start.current.x, e.clientX);
      const y = Math.min(start.current.y, e.clientY);
      const width = Math.abs(e.clientX - start.current.x);
      const height = Math.abs(e.clientY - start.current.y);
      if (width > 8 || height > 8) {
        setBox({ x, y, width, height });
        return;
      }
    }
    const el = pick(e.clientX, e.clientY);
    setHover(el ? { rect: rectOf(el), label: describe(el, "") } : null);
  };

  const up = (e: PointerEvent) => {
    const origin = start.current;
    start.current = null;
    if (box && origin) {
      // An area: named by what sits at its middle.
      const middle = pick(box.x + box.width / 2, box.y + box.height / 2);
      onPick({
        kind: "area",
        label: `Area around ${middle ? describe(middle, screen) : `part of ${screen}`}`,
        selector: middle ? selectorFor(middle) : "",
        rect: box,
        viewport: viewport(),
      });
      return;
    }
    const el = pick(e.clientX, e.clientY);
    if (!el) return;
    onPick({
      kind: "element",
      label: describe(el, screen),
      selector: selectorFor(el),
      rect: rectOf(el),
      viewport: viewport(),
    });
  };

  const outline = box ?? hover?.rect ?? null;
  return createPortal(
    <div
      data-feedback-ui
      className="fixed inset-0 z-[300] cursor-crosshair touch-none bg-primary/[0.04]"
      onPointerMove={move}
      onPointerDown={(e) => {
        e.preventDefault();
        start.current = { x: e.clientX, y: e.clientY };
        try {
          // Keeps a drag going when the finger slides over other parts of the page.
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Without capture, the overlay still covers the whole screen.
        }
        setBox(null);
      }}
      onPointerUp={up}
      role="application"
      aria-label="Point at the part of the screen your feedback is about"
    >
      <div className="pointer-events-none fixed left-1/2 top-3 w-max max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground shadow-lg">
        Tap or click the thing you mean, or drag a box around an area.
        <span className="hidden sm:inline"> Esc to go back.</span>
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onCancel}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg ring-1 ring-border"
      >
        Cancel
      </button>
      {outline && (
        <div
          className={`pointer-events-none fixed rounded-md border-2 border-[#FF5A25] bg-[#FF5A25]/10 ${
            box ? "border-dashed" : "transition-all duration-75"
          }`}
          style={{
            left: outline.x - 3,
            top: outline.y - 3,
            width: outline.width + 6,
            height: outline.height + 6,
          }}
        >
          {!box && hover && (
            <span
              className="absolute bottom-[calc(100%+4px)] max-w-[min(420px,80vw)] truncate whitespace-nowrap rounded bg-[#FF5A25] px-2 py-0.5 text-[11px] font-medium text-white"
              style={outline.x > window.innerWidth * 0.6 ? { right: -2 } : { left: -2 }}
            >
              {hover.label}
            </span>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
};

export default FeedbackPicker;
