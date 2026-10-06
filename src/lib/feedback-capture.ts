/**
 * What feedback carries besides the words: the thing the sender pointed at,
 * the screen as they saw it, and the context they would never think to type.
 *
 * Everything here runs in the browser at the moment feedback is written. The
 * element helpers take a minimal element shape so they can be tested without
 * a page.
 */

import { NAV_ITEMS } from "@/config/navigation";

/* ------------------------------------------------------------ the target */

/** Just enough of a DOM element to describe it. */
export type ElementLike = {
  tagName: string;
  id?: string;
  getAttribute(name: string): string | null;
  textContent: string | null;
  parentElement: ElementLike | null;
};

export type FeedbackTarget = {
  /** "area" when the sender dragged a box rather than picking one element. */
  kind: "element" | "area";
  /** Readable: "Button ‘Add item’ on Pantry". */
  label: string;
  /** Finds the element again for "Open where it happened". */
  selector: string;
  /** Where it sat on the sender's screen, in CSS pixels. */
  rect: { x: number; y: number; width: number; height: number };
  viewport: { width: number; height: number };
};

const clean = (s: string | null | undefined, max = 60) => {
  const text = (s ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const ROLE_NAMES: Record<string, string> = {
  button: "Button",
  link: "Link",
  tab: "Tab",
  checkbox: "Checkbox",
  radio: "Option",
  textbox: "Text box",
  combobox: "Dropdown",
  dialog: "Dialog",
  row: "Row",
  cell: "Cell",
  heading: "Heading",
  img: "Picture",
  navigation: "Navigation",
  menuitem: "Menu item",
};

const TAG_NAMES: Record<string, string> = {
  button: "Button",
  a: "Link",
  input: "Field",
  textarea: "Text box",
  select: "Dropdown",
  h1: "Heading",
  h2: "Heading",
  h3: "Heading",
  h4: "Heading",
  img: "Picture",
  table: "Table",
  tr: "Row",
  td: "Cell",
  th: "Column heading",
  li: "List item",
  article: "Card",
  nav: "Navigation",
  aside: "Panel",
  header: "Header",
  footer: "Footer",
  form: "Form",
  label: "Label",
  p: "Text",
  span: "Text",
  svg: "Icon",
};

/** What the element is called, the way a person would say it. */
export function nameOf(el: ElementLike): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role") ?? "";
  const kind = ROLE_NAMES[role] ?? TAG_NAMES[tag] ?? "Area";
  const label =
    clean(el.getAttribute("aria-label")) ||
    clean(el.getAttribute("title")) ||
    clean(el.getAttribute("placeholder")) ||
    clean(el.getAttribute("alt")) ||
    clean(el.textContent, 50);
  return label ? `${kind} ‘${label}’` : kind;
}

/** The nearest named region the element sits in: a dialog, a panel, a section. */
export function regionOf(el: ElementLike): string {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const tag = p.tagName.toLowerCase();
    const role = p.getAttribute("role") ?? "";
    const label = clean(p.getAttribute("aria-label"), 40);
    if (
      label &&
      (["dialog", "region", "navigation", "complementary", "group", "tablist"].includes(role) ||
        ["aside", "nav", "section", "form", "article", "dialog"].includes(tag))
    )
      return label;
  }
  return "";
}

export function describe(el: ElementLike, screen: string): string {
  const region = regionOf(el);
  return [nameOf(el), region ? `in ${region}` : "", screen ? `on ${screen}` : ""]
    .filter(Boolean)
    .join(" ");
}

const cssId = (s: string) => s.replace(/([^\w-])/g, "\\$1");

/**
 * A selector that finds this element and no other: it climbs from the
 * element, adding one step at a time (an id, an aria-label, or the tag and
 * its position among its siblings), and stops as soon as the path matches
 * exactly one element on the page. Good for the same build; a redesign may
 * move things, in which case the reviewer is shown where it was instead.
 */
export function selectorFor(el: Element): string {
  const doc = el.ownerDocument;
  const unique = (sel: string) => {
    try {
      return doc.querySelectorAll(sel).length === 1;
    } catch {
      return false;
    }
  };
  const parts: string[] = [];
  let node: Element | null = el;
  for (let depth = 0; node && node !== doc.body && depth < 30; depth++) {
    const tag = node.tagName.toLowerCase();
    if (node.id && !/^:r|radix|headlessui/i.test(node.id)) {
      const anchored = [`#${cssId(node.id)}`, ...parts].join(" > ");
      if (unique(anchored)) return anchored;
    }
    const label = node.getAttribute("aria-label");
    if (label && label.length < 80) {
      const anchored = [`${tag}[aria-label="${label.replace(/"/g, '\\"')}"]`, ...parts].join(" > ");
      if (unique(anchored)) return anchored;
    }
    const parent: Element | null = node.parentElement;
    const same = parent
      ? Array.from(parent.children).filter((c) => c.tagName === node!.tagName)
      : [];
    parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(node) + 1})` : tag);
    if (unique(parts.join(" > "))) return parts.join(" > ");
    node = parent;
  }
  return ["body", ...parts].join(" > ");
}

/* ------------------------------------------------------------- screens */

/** The main heading of the page on show, the record's own name on detail pages. */
export function pageHeading(): string {
  return clean(document.querySelector("main h1")?.textContent, 80);
}

/**
 * The screen's human name. Detail pages carry the record they show
 * ("Recipe: Jollof Rice"), taken from the page heading when it has loaded.
 */
export function screenFor(pathname: string, heading = ""): string {
  const exact = NAV_ITEMS.find((i) => i.path === pathname);
  if (exact) return exact.label;
  const detail = (kind: string) => (heading ? `${kind}: ${heading}` : kind);
  if (/^\/pantry\/alerts\/[^/]+$/.test(pathname)) return detail("Pantry alert");
  if (/^\/pantry\/[^/]+\/prices$/.test(pathname)) return detail("Price Passport");
  if (pathname.startsWith("/recipes/")) return detail("Recipe");
  if (pathname.startsWith("/groups/")) return detail("Group");
  return heading || "Shelf Control";
}

/* ----------------------------------------------------- recent history */

type Visit = { at: string; route: string; screen: string };
type Fault = { at: string; message: string };
const visits: Visit[] = [];
const faults: Fault[] = [];
let listening = false;

/** Remember where the sender has been, so a report shows how they got there. */
export function recordVisit(route: string, screen: string) {
  if (visits[visits.length - 1]?.route === route) return;
  visits.push({ at: new Date().toISOString(), route, screen });
  if (visits.length > 8) visits.shift();
}

/** Start keeping the last few errors the app hits. Safe to call more than once. */
export function listenForErrors() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const keep = (message: string) => {
    faults.push({ at: new Date().toISOString(), message: clean(message, 300) });
    if (faults.length > 8) faults.shift();
  };
  window.addEventListener("error", (e) => keep(e.message || String(e.error)));
  window.addEventListener("unhandledrejection", (e) =>
    keep(e.reason instanceof Error ? e.reason.message : String(e.reason)),
  );
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    keep(args.map((a) => (a instanceof Error ? a.message : String(a))).join(" "));
    original(...args);
  };
}

/* ------------------------------------------------------------ context */

/** A readable browser name from a user-agent string: "Chrome 140 on macOS". */
export function browserOf(ua: string): string {
  const os = /Mac OS X/.test(ua)
    ? "macOS"
    : /Windows/.test(ua)
      ? "Windows"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Android/.test(ua)
          ? "Android"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const browser =
    /Edg\/(\d+)/.exec(ua)?.[1] !== undefined
      ? `Edge ${/Edg\/(\d+)/.exec(ua)![1]}`
      : /Chrome\/(\d+)/.test(ua)
        ? `Chrome ${/Chrome\/(\d+)/.exec(ua)![1]}`
        : /Firefox\/(\d+)/.test(ua)
          ? `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}`
          : /Version\/(\d+).*Safari/.test(ua)
            ? `Safari ${/Version\/(\d+)/.exec(ua)![1]}`
            : "A browser";
  return os ? `${browser} on ${os}` : browser;
}

export type FeedbackContext = {
  /** The page heading as the sender read it, e.g. "Jollof Rice". */
  heading: string;
  title: string;
  window: { width: number; height: number };
  screen: { width: number; height: number; pixelRatio: number };
  browser: string;
  timeZone: string;
  sentAt: string;
  visits: Visit[];
  errors: Fault[];
};

export function gatherContext(): FeedbackContext {
  return {
    heading: pageHeading(),
    title: clean(document.title, 120),
    window: { width: window.innerWidth, height: window.innerHeight },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1,
    },
    browser: browserOf(navigator.userAgent),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sentAt: new Date().toISOString(),
    visits: [...visits],
    errors: [...faults],
  };
}

/* ---------------------------------------------------------- screenshot */

const MAX_WIDTH = 1600;
const MAX_CHARS = 1_400_000;
const BLANK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * Tags what the copy needs to look right, and returns the untagging.
 *
 * Fixed and stuck elements sit where the sender sees them only because the
 * window is scrolled. The copy is drawn unscrolled and shifted up instead, so
 * each one is tagged with the offset that puts it back where it was.
 *
 * Anything below the fold is left out of the copy, which would shrink every
 * panel that runs past the fold and pull its bottom edge (borders, decorative
 * lines) up into view, so those panels are tagged with their real height.
 */
function prepareCapture(scrollY: number, height: number): () => void {
  const tagged: HTMLElement[] = [];
  for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
    const rect = el.getBoundingClientRect();
    const position = getComputedStyle(el).position;
    if (position === "fixed") {
      el.dataset.fbPin = `fixed:${rect.top + scrollY}`;
    } else if (position === "sticky") {
      // Where it would sit unstuck, measured by unsticking it for a moment.
      const inline = el.style.position;
      el.style.position = "static";
      const natural = el.getBoundingClientRect().top;
      el.style.position = inline;
      el.dataset.fbPin = `sticky:${rect.top - natural}`;
    } else if (rect.top < height && rect.bottom > height) {
      el.dataset.fbHeight = String(rect.height);
    } else {
      continue;
    }
    tagged.push(el);
  }
  return () =>
    tagged.forEach((el) => {
      delete el.dataset.fbPin;
      delete el.dataset.fbHeight;
    });
}

/**
 * The screen as the sender sees it right now, without any marking, or null
 * when the page cannot be drawn. Only what is on screen is copied: anything
 * below the fold is left out and pictures scrolled past are not fetched, so a
 * long page costs about the same as a short one.
 */
export async function captureCanvas(): Promise<HTMLCanvasElement | null> {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scrollY = window.scrollY;
  const scrolledPast = new Set(
    Array.from(document.images)
      .filter((img) => {
        const r = img.getBoundingClientRect();
        return r.bottom <= 0 || r.top >= height;
      })
      .map((img) => img.currentSrc || img.src),
  );
  const untag = prepareCapture(scrollY, height);
  try {
    const { domToCanvas } = await import("modern-screenshot");
    return await domToCanvas(document.body, {
      width,
      height,
      scale: Math.min(1, MAX_WIDTH / width),
      timeout: 2500,
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
      // An open dialog clips the page to stop it scrolling; the copy is unclipped.
      style: {
        overflow: "visible",
        height: "auto",
        ...(scrollY ? { transform: `translateY(${-scrollY}px)` } : {}),
      },
      filter: (node) => {
        if (!(node instanceof Element)) return true;
        if (node.closest("[data-feedback-ui]")) return false;
        if (node.closest("[data-fb-pin]")) return true;
        // Below the fold: dropping it moves nothing that is on screen.
        return node.getBoundingClientRect().top < height;
      },
      fetchFn: async (url) => (scrolledPast.has(url) ? BLANK : false),
      // Once the copy is complete (its copied styles included), put fixed and
      // stuck elements back where the sender saw them, and keep panels that
      // run past the fold at their real height.
      onCloneNode: (root) => {
        // The copy may belong to another frame, so no instanceof checks here.
        const scope = root as unknown as ParentNode;
        if (typeof scope.querySelectorAll !== "function") return;
        for (const el of Array.from(scope.querySelectorAll<HTMLElement>("[data-fb-height]"))) {
          el.style.setProperty("height", `${el.dataset.fbHeight}px`, "important");
          el.style.setProperty("box-sizing", "border-box", "important");
        }
        for (const el of Array.from(scope.querySelectorAll<HTMLElement>("[data-fb-pin]"))) {
          const [kind, value] = (el.dataset.fbPin ?? "").split(":");
          if (kind === "fixed") {
            el.style.setProperty("top", `${value}px`, "important");
            el.style.setProperty("bottom", "auto", "important");
          } else {
            el.style.setProperty("position", "relative", "important");
            el.style.setProperty("top", `${value}px`, "important");
          }
        }
      },
    });
  } catch {
    return null;
  } finally {
    untag();
  }
}

/**
 * A captured screen as a JPEG data URL, the target dimmed around and circled
 * when there is one. Works on a copy, so one capture serves every pick.
 */
export function markScreen(source: HTMLCanvasElement, target: FeedbackTarget | null): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0);
  if (target) {
    const s = canvas.width / target.viewport.width;
    const pad = 6;
    const x = (target.rect.x - pad) * s;
    const y = (target.rect.y - pad) * s;
    const w = (target.rect.width + pad * 2) * s;
    const h = (target.rect.height + pad * 2) * s;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    // Dim everything but the target, then ring it.
    ctx.fillRect(0, 0, canvas.width, y);
    ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h);
    ctx.fillRect(0, y, x, h);
    ctx.fillRect(x + w, y, canvas.width - x - w, h);
    ctx.lineWidth = Math.max(3, 3 * s);
    ctx.strokeStyle = "#FF5A25";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8 * s);
    ctx.stroke();
    ctx.restore();
  }
  for (const quality of [0.72, 0.55, 0.4]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_CHARS) return url;
  }
  return null;
}

/* ----------------------------------------------- open where it happened */

const HIGHLIGHT_KEY = "sc.feedback.highlight";

/** Ask the next screen to show the reviewer the thing the sender pointed at. */
export function requestHighlight(target: FeedbackTarget) {
  try {
    window.sessionStorage.setItem(
      HIGHLIGHT_KEY,
      JSON.stringify({
        selector: target.selector,
        label: target.label,
        rect: target.rect,
        at: Date.now(),
      }),
    );
  } catch {
    // Without storage the reviewer still lands on the right screen.
  }
}

export function takeHighlight(): {
  selector: string;
  label: string;
  rect: FeedbackTarget["rect"];
} | null {
  try {
    const raw = window.sessionStorage.getItem(HIGHLIGHT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(HIGHLIGHT_KEY);
    const value = JSON.parse(raw);
    return Date.now() - value.at < 60_000 ? value : null;
  } catch {
    return null;
  }
}
