# Shelf Control — Mobile Optimization Handover

**Date:** 24–25 July 2026 (updated)
**Author:** Claude (Claude Code) · reviewed via Codex by the user
**Briefs implemented:** [`mobile-optimization-implementation-handoff.md`](./mobile-optimization-implementation-handoff.md) · the light/dark surface-polish note · the Pantry header redesign brief

---

## TL;DR

Three waves of work, all **live** and all preserving desktop:

1. **Mobile optimization** (Phases 1–3) — responsive shell, phone bottom-nav + Quick Add/More, per-screen work. `3bd59c0`.
2. **Light/dark surface polish** — layered surface tokens, Pantry media wells, dashboard hierarchy. `ada692d` · plus the media-slot blend `372d98a`.
3. **Pantry mobile header redesign** — seven stacked rows → four purposeful rows. `aed1280`.

No backend/schema/Supabase/auth changes at any point; the `import-recipe` SSRF hardening is untouched. `npm run build` + **79/79 unit tests** pass throughout; no new lint violations on changed files.

**Live app:** https://shelfcontrol-nutritionassistant.lovable.app

> ⚠️ **push ≠ publish.** Pushing to `main` syncs Lovable's *preview*; the **published** URL keeps serving the old bundle until a deploy is triggered (Lovable editor, or `deploy_project` via the Lovable MCP connector). This bit us once — the source synced but the live site didn't change. Always verify the live CSS/JS bundle hash actually changed.

---

## 1. Coordinates

| | |
|---|---|
| **GitHub repo** | `kwamzzzz/shelfcontrol-nutritionassistant` (public) |
| **Branch / HEAD** | `main` → `aed1280` · earlier branches `mobile-optimization`, `surface-polish` |
| **Base commit** | `ace33c1` "Harden recipe imports against SSRF" (untouched; SSRF work intact) |
| **Stack** | Vite · React 18 · TS · React Router · Tailwind + shadcn/Radix · TanStack Query · Supabase · next-themes · Recharts · Vitest · **Lovable-managed** |
| **Supabase project** | `ogcxclddioyxljzntfyr` |
| **Lovable project** | id `1eb8802d-70ee-4f4b-9f46-51652f90e6c5` · workspace `9kK1hKX9Sxt0c7m5bYWE` ("mawusi's Lovable") |
| **Lovable editor** | https://lovable.dev/projects/1eb8802d-70ee-4f4b-9f46-51652f90e6c5 |

### Local clones (there are two — don't confuse them)
- **Codex review copy** (where this work was done + pushed): `~/Documents/Codex/2026-07-23/shelf-control-handover-2026-07-22/repo` — on `main` at `aed1280`, in sync with origin.
- **Older Desktop clone**: `~/Desktop/shelfcontrol-nutritionassistant` — has *uncommitted* ad-hoc mobile tweaks from an earlier pass (now **superseded** by this commit). To sync it: `git fetch && git reset --hard origin/main` (this **discards** those local tweaks) or stash them first.

### Run locally
```bash
npm install          # (bun also works; repo has both lockfiles)
npm run dev          # vite, port 8080
npm run build        # production build ✅
npm test             # vitest — 79 tests pass
npx eslint <file>    # repo-wide lint baseline already fails; keep changed files clean
```

---

## 2. What shipped (Phases 1–3)

### Foundation (the architecture)
- **`src/hooks/use-shell-mode.tsx`** (NEW) — `useShellMode()` returns `"phone" | "tablet" | "desktop"`, the **single source of truth**, reconciling the prior conflicting 640 / 768 / 1024 breakpoints. matchMedia-driven (no resize listener). `use-mobile.tsx` now delegates to it.
- **`src/config/navigation.ts`** (NEW) — one typed nav model driving the desktop sidebar **and** the phone bottom-nav + More sheet (preserves the exact desktop grouping/order).
- **`src/index.css`** — safe-area/layout CSS var contract (`--safe-*`, `--phone-header-height`, etc.), iOS hardening: ≥16px inputs on touch, **reveal hover-only actions on touch**, reduced-motion, no hover-scale; safe-area utility classes.
- **`index.html`** — `viewport-fit=cover, interactive-widget=resizes-content`; light/dark `theme-color`; apple-mobile-web-app meta.
- **Phone shell** (`AppLayout.tsx` mode-based, one `<Outlet/>` with chrome swapped around it):
  - `PhoneHeader.tsx` (NEW) — compact contextual title + group switcher, safe-area padded.
  - `MobileBottomNav.tsx` (NEW) — Home · Pantry · **[+] Add** · Shopping · More, correct active states.
  - `QuickAddSheet.tsx` (NEW) — Log Purchase / Consumption / Add Pantry Item; **reuses the existing dialogs** (refactored to accept controlled `open`/`onOpenChange`/`hideTrigger`).
  - `MoreSheet.tsx` (NEW) — all non-slot routes grouped Activity/Intelligence/Community/Account, + **theme toggle** (phone has no sidebar).
  - `AppSidebar.tsx` — tablet **rail** (68px) via `mode`, removed the old phone top-bar/drawer.
- **Overlays/toasts** — `dialog.tsx`/`alert-dialog.tsx` fit within `dvh` minus safe areas + internal scroll + mobile margin; `drawer.tsx` safe-area; `toast.tsx`/`sonner.tsx` positioned above the bottom nav + safe area on phone.

### Per-screen (desktop preserved throughout)
- **Dashboard** — hide the floating FAB on phone (Quick Add replaces it); **fixed a pre-existing tablet bug** (lower cards used `lg:col-span-*` with no `md:`, collapsing to 1/12 at 768–1023px) by adding `md:` col-spans.
- **Pantry** — location chips scroll on phone; **Item Catalog table → mobile cards**.
- **Purchases** — phone **`?trip` master-detail** (list *or* one receipt + Back; desktop split preserved).
- **Bulk review** (`BulkReviewTable`) — 720px table → **editable stacked cards** on phone.
- **Nutrition** — 7 wrapped tabs → **section-selector dropdown** on phone (visible tabs on `md:`+).
- **Coach** — `100vh` → `dvh` height fitting the phone chrome (below header / above nav); keyboard-aware viewport.
- **Analytics** — tab bar scrolls horizontally on phone.
- **Intelligence / Food Intelligence** — sticky filter chips offset below the header (were hidden under it).
- **Auth** — `min-h-dvh` safe-height, email/password `autoComplete` + `inputMode`, larger sign-up tap target.
- **Invitations** — Accept/Decline full-width 44px on phone (duplicate-submit already guarded).
- **Challenges** — phone segmented Active/Upcoming/Completed selector (all stacked on desktop).
- **Profile** — `autoComplete="name"`, full-width Save on phone.
- **Consumption / Recipes / Recipe Detail / Group Detail / Groups / Settings** — already responsive; hover-only actions fixed globally.

### Cross-cutting
- One CSS rule reveals **all** hover-gated actions on touch devices (fixed edit/delete hidden behind hover across ~10 components).

---

## 3. Verification

- `npm run build` ✅ · `npm test` → **79/79** ✅ · lint on changed files → only **pre-existing** violations (empty `TextareaProps`, `catch (e: any)`, sonner dual export), **no new** ones.
- **Live viewport sweep** on the authenticated app:
  - **Desktop 1440×900** — sidebar + topbar + 12-col grid **fully preserved**.
  - **Tablet 768×1024** — 68px rail; dashboard fix verified.
  - **Phone 375×812 (light + dark)** — header, bottom nav, Quick Add → controlled dialog, More sheet (+ theme toggle), Nutrition selector all working; dark mode cohesive.
- **Deploy confirmed live** — the public app's served HTML contains this commit's `viewport-fit=cover, interactive-widget=resizes-content` + theme-color metas; Lovable's project copy contains the new `use-shell-mode.tsx`.

---

## 4. Open items / deferred (with rationale)

**Deferred polish (intentional):**
- **Pantry/Recipes header overflow menus** — kept as `flex-wrap` (all actions stay visible on phone). True overflow menus need refactoring 3+ more self-triggered dialogs (Stats/Cleanup/ShelfLife/Import) to controlled — disproportionate risk.
- **Sticky Add bars** (Shopping/Purchases) — would crowd the fixed bottom nav; header Add is functional.
- **Chart-level tuning** — tab *content* charts (Recharts) already use responsive grids; summary-before-chart / axis-density / lazy-load not individually tuned.

**Review passes not fully done (need a real device or deeper pass):**
- **Landscape-phone override** (coarse-pointer + short height → phone shell) is code-correct but **untestable in the browser emulator** (reports a fine pointer); confirm on a physical iPhone.
- 200%-text and VoiceOver passes were spot-checked, not exhaustive.

**Pre-existing bugs noticed (NOT mine, not fixed):**
- `src/pages/FoodIntelligence.tsx:42` — React "duplicate key" warning (news items keyed non-uniquely).
- Repo-wide lint baseline already fails (many `catch (e: any)`, empty interfaces, etc.).

---

## 5. Key files

```
NEW:
  src/hooks/use-shell-mode.tsx
  src/config/navigation.ts
  src/components/layout/{PhoneHeader,MobileBottomNav,QuickAddSheet,MoreSheet}.tsx

CHANGED (highlights):
  index.html · src/index.css
  src/hooks/use-mobile.tsx
  src/components/layout/{AppLayout,AppSidebar}.tsx
  src/components/ui/{dialog,alert-dialog,textarea,toast,sonner,drawer}.tsx
  src/components/purchases/{AddPurchaseDialog,BulkReviewTable}.tsx
  src/components/consumption/AddConsumptionDialog.tsx
  src/components/pantry/{AddInventoryDialog,ItemCatalogSection}.tsx
  src/components/cookbook/StepByStepMode.tsx
  src/pages/{Dashboard,Pantry,Purchases,Nutrition,Coach,Analytics,Intelligence,
            FoodIntelligence,Auth,Invitations,Challenges,Profile,AcceptInvite}.tsx
```
Full diff: `git show 3bd59c0` (36 files, +/- ~2k lines).

---

## 5b. Later waves (surface polish + Pantry header)

### Wave 2 — light/dark surface system (`ea7ce8b`…`ada692d`, media slot `372d98a`)
- **Layered surface tokens** in `src/index.css`: `--surface-canvas / -panel / -raised / -subtle / -inset`, `--media-stage`, plus `.surface-panel` / `.surface-raised` / `.surface-subtle` / `.media-well` utilities. Light `--background` moved off pure white (`150 18% 97%`) so white cards read as raised surfaces; dark keeps three steps and never pure black.
- **Dashboard**: seven translucent `glass-card` modules → opaque `surface-panel`; Smart Restock kept as the only dominant gradient; hardcoded `bg-white/[0.0x]` values (invisible on a tinted light canvas) replaced with tokens. Also fixed a **pre-existing tablet bug** where lower cards used `lg:col-span-*` with no `md:` value and collapsed to 1/12 width at 768–1023px.
- **Pantry media slot**: product shots ship on white studio backgrounds, so `object-contain` left every photo on a white plate inside the neutral slot. The image now **multiplies** into the well so its white reads as the slot itself. Because multiply needs a light backdrop, `--media-stage` **stays light in dark mode** — a dark slot can only ever show a white plate. Revert that one token in `.dark` if dark slots are preferred (accepting white plates).
- Global: hover-only actions revealed on touch; hover-scale disabled on coarse pointers.

### Wave 3 — Pantry mobile header (`d649e85`, `aed1280`)
Seven stacked rows (~830px, first card below the fold) → **four rows, first card at ~200px**, no shrunken type.

| Row | Control |
|---|---|
| Scope | `[Current | History]` segmented + **Tools** pill |
| Find | Search + **Filters** pill (active-count badge) |
| Place | Location chips — scrolling, full labels, one selected treatment |
| State | Status ribbon (`85 All · 0 Use soon · 10 Expired…`), also a one-tap filter |

- **Archive is a state, not a time.** `monthOptions = ["all", ...months, "archived"]` was why that row read as navigation. History now reveals months, with Archived past a divider.
- **Tools** (Stats / Shelf-Life / Cleanup) behind one labelled pill → `PantryToolsSheet`. Their dialogs gained optional `open`/`onOpenChange`/`hideTrigger` (`PantryToolDialogProps`), so the desktop toolbar is untouched.
- Dropped on phone only: the duplicate page `<h1>` (app header already shows "Pantry") and the duplicate Add button (Quick Add covers it).
- **Latent bug fixed:** status counts now derive from a pre-status `scoped` list; selecting a status used to zero the other counts.
- Design chosen via a 4-proposal / 3-lens adversarial panel. Two deliberate departures: location chips stayed **visible** (the top-scoring proposal buried them; location is the pantry's primary mental model), and Stats stayed **in** Tools rather than surfaced.

---

## 6. Workflow notes

- **Lovable ↔ GitHub:** push to `main` → Lovable's GitHub App pulls the code. **This syncs the preview, not necessarily the published site** — trigger a deploy to publish (see the TL;DR warning). No CI/Action in the repo does it.
- **Migrations are NOT auto-applied** — run them manually in the Supabase SQL editor. (This commit has **no** migrations.)
- **A Lovable MCP connector is now available** (the "Lovable apps in Claude" feature). It exposes `get_me`, `list_projects`, `get_project`, `read_file`/`list_files`, `get_diff`, `deploy_project`, `query_database`, `send_message`, `get_project_analytics`, etc. — so future work can read/inspect/deploy the Lovable project directly, not only via git.
- **Editing conflicts:** the Lovable editor and git both write to `main`. If someone edits in Lovable while a branch is open, rebase before pushing.

---

## 7. Suggested next steps

1. **Physical-iPhone pass** (notch / home-indicator / landscape / keyboard / VoiceOver / 200% text) — the one thing the emulator can't fully verify. The landscape-phone shell rule (coarse pointer + short height) is code-correct but untestable in the browser emulator, which reports a fine pointer.
2. **Playwright is unrunnable** — `npx playwright test` fails with `ERR_MODULE_NOT_FOUND` (missing config package). **No E2E coverage is claimed anywhere in this work.** Fixing that dependency would unlock the regression suite.
3. Surface follow-through for Shopping (sticky summary), Nutrition (restrained teal), Intelligence (restrained violet) — tokens exist; only the shared system has been applied so far.
4. Recipes header still has the multi-action row that Pantry just solved — the `PantryToolsSheet` pattern ports directly.
5. A functional **Settings** screen (theme/notification controls are still "Coming soon"); the phone theme toggle currently lives in the More sheet.
6. Fix the pre-existing `FoodIntelligence` duplicate-key React warning (`src/pages/FoodIntelligence.tsx:42`).
7. **Data quirk, not a bug:** History → a month can show "N items purchased" with an empty grid, because those purchases predate the auto-add-to-pantry feature and have no inventory rows. A backfill would resolve it.
