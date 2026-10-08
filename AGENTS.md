# Shelf Control: standing instructions for agents (Codex reads this file)

Kwame records the build of this app in his journal in Synapse Studio
(`~/synapse-studio/src/data/journal/shelf-control.json`). Claude writes and commits the journal
chapters. See CLAUDE.md for the full journaling and screenshot steps.

## Codex
- Work orders and run-downs go in `.agents/MAILBOX.md`. Append at the bottom; never rewrite what
  is above.
- Claude is the only one who commits and pushes. Leave your work uncommitted and say so in the
  mailbox.
- Claude owns the dev server (`http://127.0.0.1:8095`). Don't start a second one. Run any
  browser checks in your own headless browser, never in Kwame's Chrome.
- Finish every job with a run-down in the mailbox, written for the journal in plain English:
  what you changed and why, what you tried and set aside, any bugs and how they were fixed,
  what you tested, and the files touched.

<!-- house-style:start -->
## House style

Generated from Kwame's house-style skill (`~/.claude/skills/house-style/SKILL.md`). Refresh this section from the skill rather than editing it by hand.

Before building anything that might already exist, check **Use these first**. After a change, run a house style check.

### The rules
1. Dropdowns: every boxed `<select>` uses a custom chevron 12px from the right edge with 34px right padding, set once globally.
2. Every colour comes from the brand tokens, including focus rings, hover, selection, caret, autofill and validation states.
3. Side panels can be collapsed to a slim rail and resized by dragging, and remember the choice per device.
4. Pages more than one level deep show breadcrumbs.
5. No thick coloured stripe down one side of a card, banner or note. Use a soft tinted surface, hairline border and icon tile.
6. Focus rings are for keyboard users only. Opening a dialog or sheet focuses the container, not its first control.
7. Fetch on demand first, subscribe second, poll slowly as a last resort, and clean up every subscription when its screen closes.
8. One version of everything. A new version replaces the old one in the same change, and the old one is deleted. No `V2`, `New`, `Old`, `Legacy`, `Copy` or `Backup` files. A fallback is only for things outside the app's control, and says why in one line.
9. Build once, use everywhere. Anything shown in more than one place is one shared piece used with options, never a copy. The same action uses the same word everywhere.

### Use these first
- `src/components/ui/*`: the base kit (dialog, sheet, alert-dialog, button, select and so on).
- `src/components/shared/GroupedUnitSelect.tsx`: the unit picker for every quantity field. Units come from `UNIT_GROUPS` in `src/lib/pantry-utils.ts`.
- `src/components/shared/ImageUpload.tsx`: adding, replacing or removing a photo in any add or edit dialog. `src/hooks/useSignedImage.ts`: showing any stored image (signed URLs for the private bucket).
- `src/components/purchases/QuickAddItemForm.tsx`: creating a new catalogue item inline, wherever an item is picked.
- `src/components/pantry/PantryExitDialog.tsx`: the one dialog for using up or throwing away pantry items. Single items can skip the confirmation; bulk actions always confirm.
- `src/components/pantry/InventoryCard.tsx`: the pantry item card. `src/components/pantry/storage-style.ts`: the icon and colours for each storage place (Fridge, Freezer, Pantry, Counter).
- `src/components/pantry/PantryStatsDialog.tsx`: pantry stats, and the `PantryToolDialogProps` shape every pantry tool dialog takes so it works from the desktop toolbar and the phone Tools sheet.
- `src/components/groups/ShareToGroupDialog.tsx`: sharing pantry, recipes or receipts with a group.
- `src/components/analytics/AnalyticsLayout.tsx`, `AnalyticsModule.tsx`, `HeroStatCard.tsx`, `InsightsRail.tsx`: the page grid, section card, headline stat card and insights rail for every analytics tab.
- `src/components/brand/BrandLogo.tsx`: the logo, in light, dark or auto.
- `src/components/story/StoryArt.tsx`: the drawn artwork for Kitchen Story cards, tinted from the tokens.
- `src/lib/utils.ts` (`cn`), `src/lib/currency.ts` (`formatCurrency`): class names and money.
- `src/lib/pantry-utils.ts`: expiry status and labels, categories, storage locations, units and sealed or opened.
- `src/lib/shelf-life.ts`: how long food lasts and where to store it.
- `src/lib/nutrition.ts`: nutrition totals and units.
- `src/lib/recipe-pantry.ts`, `src/lib/ingredient-match.ts`: what a recipe needs against what's in the kitchen, and matching ingredients to pantry items.
- `src/lib/item-media.ts`: the photo for a pantry item, or an honest "photo needed" state.
- `src/hooks/use-shell-mode.tsx` (`useIsPhone`, `useIsDesktop`): phone or desktop layout.
- Scrollbars: thin and invisible, set once globally in `src/index.css`.

### Known to tidy (found at setup, 8 Oct 2026)
- `SealedStatus` is defined in both `src/lib/pantry-utils.ts` and `src/lib/shelf-life.ts` (rule 9).
- Two toast systems run side by side: `src/hooks/use-toast.ts` with `src/components/ui/toaster.tsx`, and `sonner` with `src/components/ui/sonner.tsx`. Both are mounted in `src/App.tsx` (rule 9).
<!-- house-style:end -->
