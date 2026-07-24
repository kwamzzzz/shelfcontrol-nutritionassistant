# Shelf Control — Session Handover

**Date:** 25 July 2026
**Purpose:** context for a new Claude chat picking up this project.
**Previous handover:** `~/Downloads/shelf-control-handover-2026-07-22.md` (still accurate for app features/DB; superseded on mobile/UI).

---

## 1. Read this first — current state

| | |
|---|---|
| **GitHub** | `kwamzzzz/shelfcontrol-nutritionassistant` (public) · branch `main` |
| **`main` HEAD** | **`aed1280`** — pushed, **live and verified** |
| **Live app** | https://shelfcontrol-nutritionassistant.lovable.app |
| **Working repo** | `~/Documents/Codex/2026-07-23/shelf-control-handover-2026-07-22/repo` |
| **Supabase** | project `ogcxclddioyxljzntfyr` |
| **Lovable** | project `1eb8802d-70ee-4f4b-9f46-51652f90e6c5` · workspace `9kK1hKX9Sxt0c7m5bYWE` · [editor](https://lovable.dev/projects/1eb8802d-70ee-4f4b-9f46-51652f90e6c5) |

### ⚠️ Uncommitted work in the tree — do not clobber
- **`src/pages/Pantry.tsx` has uncommitted modifications made by Codex** (the user reviews my work with Codex and edits directly). At last look these were genuine improvements — deriving the Current/History `mode` from `purchaseFilter` instead of holding it in state (fixes desync when the viewport changes after a desktop month/archive selection), and introducing `useIsPhone()` to branch the shell rather than duplicating rows via `sm:` classes.
- **`docs/` commit `abe9e98`** exists locally and is **unpushed** (handover doc). Harmless; it will ride along with the next code push.
- **Do not `git reset --hard`, do not force-push.** Reconcile.

### Two local clones — don't confuse them
- ✅ **`~/Documents/Codex/.../repo`** — authoritative, in sync with origin.
- ⚠️ **`~/Desktop/shelfcontrol-nutritionassistant`** — stale, has superseded uncommitted edits from an early session. `git fetch && git reset --hard origin/main` there **discards** them.

---

## 2. Three traps that have already bitten

1. **Push ≠ publish.** Pushing to `main` syncs Lovable's *preview*; the **published** site keeps serving the old bundle until a deploy is triggered. Verify the live asset hash actually changed:
   ```bash
   curl -s https://shelfcontrol-nutritionassistant.lovable.app/ | grep -oE '/assets/index-[A-Za-z0-9_-]+\.(js|css)'
   ```
   Publish via the Lovable editor, or the **Lovable MCP connector**'s `deploy_project` (pass `name: "shelfcontrol-nutritionassistant"` to keep the URL).
2. **Lovable commits to `main` concurrently.** It has done so mid-task twice — once on the *same file* I was editing. **Always `git fetch` and check divergence before pushing**; rebase, never force.
3. **Migrations are never auto-applied.** Run them by hand in the Supabase SQL editor. (None of the recent work contains migrations.)

### Lovable MCP connector
A Lovable connector is available in Claude (the "Lovable apps in Claude" feature). Useful tools: `get_me`, `list_projects`, `get_project` (returns `latest_commit_sha` + a screenshot), `read_file` / `list_files`, `get_diff`, `deploy_project`, `query_database`, `send_message`, `get_project_analytics`. Reading a file from Lovable is the fastest way to confirm a push actually synced.

---

## 3. What shipped (three waves, all live)

**Wave 1 — mobile optimization** (`3bd59c0`)
Responsive shell: `useShellMode()` → `phone | tablet | desktop` (single source of truth; reconciled three conflicting breakpoints). Phone bottom nav (Home · Pantry · **Add** · Shopping · More), Quick Add + More sheets, compact phone header, tablet rail, safe-area CSS contract (`viewport-fit=cover`, `env()` vars, `dvh`), adaptive-safe dialogs, responsive toasts, plus per-screen work across ~18 screens (Purchases got a phone `?trip` master-detail; Nutrition's 7 tabs became a section selector; Coach moved off `100vh`).

**Wave 2 — light/dark surface system** (`ea7ce8b`…`ada692d`, `372d98a`)
Layered tokens in `src/index.css`: `--surface-canvas / -panel / -raised / -subtle / -inset`, `--media-stage`, with `.surface-panel` / `.surface-raised` / `.surface-subtle` / `.media-well` utilities. Light `--background` moved off pure white so cards read as raised surfaces; dark never uses pure black. Dashboard's translucent `glass-card` modules → opaque panels, Smart Restock kept as the only dominant gradient.

**Wave 3 — Pantry mobile header** (`d649e85`, `aed1280`)
Seven stacked rows (~830px; first card below the fold) → **four rows**, first card ~200px:

| Row | Control |
|---|---|
| Scope | `[Current \| History]` + **Tools** pill |
| Find | Search + **Filters** pill (active-count badge) |
| Place | Location chips — scrolling, full labels, one selected treatment |
| State | Status ribbon (`85 All · 0 Use soon · 10 Expired…`), also a one-tap filter |

Key moves: archive taken **off the month axis** (it's an item state, not a time); Stats/Shelf-Life/Cleanup behind one labelled Tools pill → `PantryToolsSheet`; the duplicate page `<h1>` and duplicate Add button dropped on phone (the app header and Quick Add already provide them); status counts now derive from a pre-status `scoped` list (selecting a status used to zero the other counts).

---

## 4. Design decisions worth knowing

- **`--media-stage` stays light in dark mode.** This is forced, not aesthetic: product photos ship on white studio backgrounds and are `mix-blend-multiply`'d into the slot so the white reads as the slot itself. Multiply needs a light backdrop — a dark slot can only ever show a white plate. One-line revert in `.dark` if dark slots are preferred (accepting white plates on photos).
- **Location chips stayed visible** on phone, against the top-scoring proposal from a design panel that buried them in a sheet. Location is the pantry's primary mental model.
- **No icon-only controls** in the Pantry header — labelled pills throughout (the most-repeated critique across four independent design reviews).
- **Hover is never required.** A global `@media (hover: none)` rule reveals hover-gated actions on touch and disables hover-scale.

---

## 5. Open items (honest)

1. **Playwright is unrunnable** — `npx playwright test` fails with `ERR_MODULE_NOT_FOUND` (missing config package). **No E2E coverage is claimed anywhere in this work.**
2. **Physical-iPhone pass outstanding** — notch, home indicator, landscape, VoiceOver, 200% text. The landscape rule (coarse pointer + short height → phone shell) is code-correct but **cannot be emulated** — the browser reports a fine pointer.
3. **Recipes** still has the multi-action header that Pantry just solved. `PantryToolsSheet` ports directly — best next task.
4. Surface follow-through not done: Shopping sticky summary, Nutrition teal, Intelligence violet.
5. Pre-existing: `src/pages/FoodIntelligence.tsx:42` React duplicate-key warning; **Settings is a stub** ("Coming soon") — the phone theme toggle currently lives in the More sheet.
6. **Data quirk, not a bug:** History → a month can show "40 items purchased" with an empty grid. Those purchases predate the auto-add-to-pantry feature, so no inventory rows exist. A backfill would resolve it.

---

## 6. How to work on it

```bash
cd ~/Documents/Codex/2026-07-23/shelf-control-handover-2026-07-22/repo
npm install
npm run dev      # vite, port 8080
npm run build    # must pass
npm test         # vitest — 79 tests, must stay green
npx eslint <changed files>   # repo-wide lint baseline already fails; keep CHANGED files clean
```

**Conventions that have served well:**
- `git fetch` and check divergence **before** every push (Lovable writes to `main` too).
- Verify in a real browser at 320 / 375 / 390 / 430, **light and dark**, and confirm desktop is unchanged — desktop density must be preserved.
- Never touch Supabase schema, auth, RLS, Edge Functions, or the `import-recipe` SSRF hardening.
- The user reviews with **Codex** and edits the tree directly — expect uncommitted changes; reconcile rather than overwrite.

---

## 7. Verified at handover

`npm run build` ✓ · **79/79 tests** ✓ · no new lint violations on changed files · no horizontal overflow at 320/375 · three-column Pantry grid intact · zero clipped labels · zero controls under 44px · light + dark both verified · desktop confirmed unchanged (all four toolbar buttons and the `<h1>` still render; phone controls hidden) · live bundle confirmed serving the redesign.

**Zero backend changes across all three waves.**
