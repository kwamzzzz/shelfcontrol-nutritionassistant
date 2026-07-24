# Shelf Control — Light/Dark Surface Polish Build Note

**Date:** 2026-07-24  
**Audience:** Claude implementing the work  
**Reference direction:** The supplied Noon iPhone screenshots  
**Product:** Shelf Control  
**Scope:** Visual-system polish and targeted mobile refinements; preserve desktop quality and existing functionality

---

## 1. Objective

Make Shelf Control feel more dimensional, intentional, and premium in both light and dark modes.

The reference lesson is **not** to copy Noon’s brand, promotional layout, yellow/magenta palette, assets, or marketplace density. The useful lesson is its surface hierarchy:

1. A softly tinted page canvas.
2. Clear white or raised content surfaces.
3. Consistent image wells that present products cleanly.
4. Restrained borders and shadows.
5. Accent colours used for meaning.
6. Strong image-first hierarchy on small cards.
7. Stable, one-handed navigation and contextual actions.

The result must still look unmistakably like Shelf Control: calm, trustworthy, food-focused, green-led, and useful rather than promotional.

---

## 2. Mandatory preflight: reconcile Lovable and GitHub

Do not begin visual edits until the current authoritative source has been established.

As of this note:

- GitHub/local `main` is at `3bd59c0a4f2113ef00d5f9a9dc8827e7411db57d`.
- Lovable’s latest project state is `bbe2323eac39bf07b4e2590b103f662bc161a2ac`.
- Lovable received several Pantry changes after `3bd59c0`:
  - `ee611ee2` — three Pantry items per row on mobile.
  - `9166f8cf` — reduced mobile type.
  - `aed18bd9` — adjusted image/type proportions.
  - `4ab195a9` — bolder mobile Pantry cards.
  - `bbe2323e` — subsequent revert state.
- The current Lovable Mobile preview still shows a three-column Pantry.

Before editing:

1. Export/pull the current Lovable state or otherwise obtain the exact diff from `3bd59c0` to `bbe2323`.
2. Reconcile those changes into GitHub without overwriting the current three-column Pantry work.
3. Confirm GitHub, the local working tree, and Lovable represent the same source state.
4. Create a dedicated branch for this pass, e.g. `surface-polish`.
5. Run the existing tests and build before making changes.

Do not continue from local `3bd59c0` alone and accidentally erase the later Lovable edits.

---

## 3. Non-negotiable guardrails

- Do not copy Noon logos, images, illustrations, copy, banners, or branded visual assets.
- Do not introduce Noon yellow/magenta as Shelf Control’s primary identity.
- Do not add promotional clutter, advertising-style banners, or decorative carousels.
- Do not remove, hide, or reduce existing functionality.
- Do not change authentication, Supabase schema/data, RLS, Edge Functions, or `import-recipe`.
- Do not add large image assets or new runtime dependencies for this work.
- Do not redesign desktop into an enlarged phone screen.
- Do not make light mode grey and lifeless or dark mode uniformly black.
- Do not use strong glassmorphism, excessive blur, neon glows, or large drop shadows.
- Do not apply arbitrary one-off hex colours throughout components. Use tokens.
- Do not make required actions hover-only.
- Respect reduced-motion, safe areas, keyboard resizing, and existing shell breakpoints.

The desktop application must remain detailed and efficient. Mobile may simplify presentation, but must retain access to all actions.

---

## 4. Design principle: white is a surface, not the whole page

The current light theme uses nearly the same value for the body, cards, and inset content. This causes the interface to read as one flat white plane.

Create at least four perceptible but subtle surface levels:

| Role | Light mode | Dark mode |
|---|---|---|
| App canvas | Pale neutral green-grey | Deep green-black |
| Standard surface | Crisp white | Dark green-charcoal |
| Raised surface | White with soft edge/depth | Slightly lighter green-charcoal |
| Inset/media well | Cool whitish green-grey | Darker/lighter local gradient |

Depth should come primarily from **tonal separation + a soft border**. Shadows are secondary.

---

## 5. Proposed design tokens

Implement the system centrally in `src/index.css`. Existing shadcn/Tailwind semantic tokens should continue to work.

The values below are directionally specific but may be adjusted slightly after visual testing.

### 5.1 Light mode

```css
:root {
  /* Existing semantic roles, retuned */
  --background: 150 18% 97%;
  --foreground: 155 25% 12%;

  --card: 0 0% 100%;
  --card-foreground: 155 25% 12%;

  --secondary: 150 22% 95%;
  --secondary-foreground: 155 30% 22%;

  --muted: 150 17% 95%;
  --muted-foreground: 155 12% 42%;

  --border: 150 14% 89%;
  --input: 150 15% 87%;

  /* New surface roles */
  --surface-canvas: 150 18% 97%;
  --surface-panel: 0 0% 100%;
  --surface-raised: 0 0% 100%;
  --surface-subtle: 150 22% 96%;
  --surface-inset: 150 18% 93%;

  /* Media-well gradient stops */
  --media-well-start: 150 25% 98%;
  --media-well-mid: 150 20% 94%;
  --media-well-end: 150 16% 90%;

  --surface-border: 150 14% 88%;
  --surface-highlight: 0 0% 100% / 0.85;
  --surface-shadow: 155 30% 10% / 0.08;
}
```

### 5.2 Dark mode

```css
.dark {
  /* Avoid pure black; preserve visible surface steps */
  --background: 155 31% 6%;
  --foreground: 150 15% 96%;

  --card: 155 26% 10%;
  --card-foreground: 150 15% 96%;

  --secondary: 155 21% 15%;
  --secondary-foreground: 150 20% 86%;

  --muted: 155 18% 14%;
  --muted-foreground: 150 12% 64%;

  --border: 150 14% 21%;
  --input: 150 15% 100% / 0.11;

  /* New surface roles */
  --surface-canvas: 155 31% 6%;
  --surface-panel: 155 26% 10%;
  --surface-raised: 155 23% 13%;
  --surface-subtle: 155 21% 12%;
  --surface-inset: 155 20% 16%;

  /* Media-well gradient stops */
  --media-well-start: 150 20% 18%;
  --media-well-mid: 155 22% 13%;
  --media-well-end: 155 25% 9%;

  --surface-border: 150 15% 21%;
  --surface-highlight: 150 30% 100% / 0.07;
  --surface-shadow: 0 0% 0% / 0.55;
}
```

Do not use pure black as the universal dark canvas. It crushes the hierarchy and makes product images look pasted onto the screen.

### 5.3 Shared utilities

Add reusable utilities rather than repeating long arbitrary Tailwind values.

Suggested utilities:

```css
@layer utilities {
  .app-canvas {
    background-color: hsl(var(--surface-canvas));
  }

  .surface-panel {
    background-color: hsl(var(--surface-panel));
    border: 1px solid hsl(var(--surface-border));
    box-shadow:
      0 1px 2px hsl(var(--surface-shadow)),
      0 10px 30px -24px hsl(var(--surface-shadow));
  }

  .surface-raised {
    background-color: hsl(var(--surface-raised));
    border: 1px solid hsl(var(--surface-border));
    box-shadow:
      inset 0 1px 0 hsl(var(--surface-highlight)),
      0 12px 32px -24px hsl(var(--surface-shadow));
  }

  .surface-subtle {
    background-color: hsl(var(--surface-subtle));
    border: 1px solid hsl(var(--surface-border) / 0.7);
  }

  .media-well {
    background:
      radial-gradient(
        circle at 50% 24%,
        hsl(var(--surface-highlight)) 0%,
        transparent 52%
      ),
      linear-gradient(
        160deg,
        hsl(var(--media-well-start)) 0%,
        hsl(var(--media-well-mid)) 56%,
        hsl(var(--media-well-end)) 100%
      );
  }
}
```

Verify the actual CSS syntax supported by the project’s Tailwind/PostCSS pipeline. If an alpha token does not compile cleanly, split it into a separate HSL channel/alpha token.

### 5.4 Semantic soft-status tokens

Use coloured surfaces sparingly and consistently:

- Green: primary action, success, selected navigation.
- Amber: expiring soon, caution, attention.
- Coral/red: expired, destructive, urgent.
- Blue/teal: nutrition, hydration, informational.
- Violet: intelligence/recommendation features.
- Sage-grey: neutral inventory surfaces.

Create reusable `status-soft-*` classes or variants with:

- Low-saturation tinted background.
- High-contrast foreground.
- Optional matching low-opacity border.
- No saturated solid fill for large content regions.

Dark mode status surfaces must be dark tinted surfaces with brighter text, not bright badges pasted onto black.

---

## 6. Typography and hierarchy

Do not introduce a new font as part of this task.

Use the existing font stack consistently. There are already multiple font declarations in the project; avoid adding another source.

Rules:

- Page title: clear and confident, not oversized on phone.
- Section headings: stronger weight and contrast than metadata.
- Body text: at least 14px for meaningful content.
- Inputs: remain at least 16px on touch devices to prevent iOS zoom.
- Product names: two lines on mobile Pantry cards, not one-line truncation.
- Metadata: use muted colour but preserve WCAG contrast.
- Quantities/numbers: tabular numerals where already used.
- Avoid making text artificially tiny just to preserve three columns.

---

## 7. Image treatment

The Noon references consistently put product imagery on a softly lit neutral stage. Apply that principle to Pantry and other product/recipe tiles.

### Requirements

- All Pantry cards use the same `media-well` container, whether an image exists or not.
- Missing-image states must look intentional, not like broken content.
- Product packaging should generally be fully visible.
- Prefer `object-contain` with modest internal padding for catalog/package images.
- Do not crop labels off jars, tins, cartons, or bags.
- If the app later distinguishes lifestyle photography from package imagery, photography may use `object-cover`; do not invent fragile image-type heuristics in this pass.
- Use a subtle product contact shadow only if needed.
- Maintain useful `alt` text.
- Avoid expensive filters or image processing at runtime.

Suggested treatment:

```tsx
<div className="media-well relative aspect-[3/4] overflow-hidden">
  {imageUrl ? (
    <img
      src={imageUrl}
      alt={name}
      className="h-full w-full object-contain p-1.5 sm:p-2"
    />
  ) : (
    <Package aria-hidden className="..." />
  )}
</div>
```

Validate the final aspect ratio against the already-reconciled Lovable version. Preserve the three-column intent.

---

## 8. Pantry implementation

Primary files:

- `src/pages/Pantry.tsx`
- `src/components/pantry/InventoryCard.tsx`
- `src/components/pantry/QuickActionsBar.tsx`
- Related edit/detail dialogs as needed for preserved access to actions

### 8.1 Grid

Phone requirements:

- Three cards per row at supported iPhone widths.
- No horizontal page scrolling.
- Use a small, consistent gap, approximately 8px.
- Cards must use `min-w-0`.
- Validate at 320, 375, 390, and 430 CSS pixels.
- Tablet and desktop may retain roomier two/four-column layouts.

Do not implement three columns by shrinking every text size until it is unreadable.

### 8.2 Mobile card information architecture

The current card attempts to show too much:

- Image.
- Expiry badge.
- Opened badge.
- Missing-location warning.
- Archived status.
- Name.
- Brand.
- Category.
- Location.
- Purchase date/store.
- Attribution.
- Quantity.
- Quick actions.

On phone, prioritize:

1. Product image.
2. One primary status badge.
3. Two-line product name.
4. Quantity and unit.
5. At most one concise secondary metadata row.

Guidance:

- Use `line-clamp-2` for the product name.
- Do not default to one-line `truncate` on phone.
- Prefer one compact category **or** location line, not both if space is constrained.
- Move purchase date/store and attribution into the edit/detail surface on phone.
- Remove the full-width divider above quantity on the phone card.
- Keep full metadata available on tablet/desktop.
- Preserve all data and actions—simplify presentation, not functionality.

### 8.3 Status collisions

Multiple overlay badges can collide in a narrow three-column card.

On phone:

- Show the most important status directly on the image.
- Priority: expired → expiring → missing storage → opened → no expiry.
- Combine compatible information when possible.
- Put secondary statuses in the item detail/edit sheet.
- Ensure the accessible name still communicates all relevant states.

Do not place three separate pill badges over a 100–120px image.

### 8.4 Actions

The whole card remains a large tap target opening item details/editing.

Required actions must remain accessible on touch:

- Mark opened.
- Reduce quantity.
- Increase quantity.
- Log consumption.
- Discard.

Do not render a row of five tiny icon buttons inside every three-column card.

Preferred phone behaviour:

- Card tap opens the existing detail/edit surface.
- That surface exposes the full action set with 44px minimum controls.
- If a direct card action is essential, use one properly labelled overflow/action control, not several tiny controls.

Desktop hover actions may remain if keyboard and touch alternatives still exist.

### 8.5 Pantry page surfaces

- Use the tinted canvas as the page background.
- Search and category controls should sit on a clear raised/subtle surface.
- Location and month chips remain horizontally scrollable on phone.
- Intelligence/status summaries may use semantic soft surfaces:
  - Use Soon → amber tint.
  - Expired → coral tint.
  - No expiry → neutral sage.
  - Healthy/in stock → green tint.
- Section labels need enough spacing from card grids.
- Avoid enclosing every small element in another bordered box.

---

## 9. Dashboard implementation

Primary files:

- `src/pages/Dashboard.tsx`
- `src/components/dashboard/*`
- Any shared analytics/stat card primitives touched by the Dashboard

### 9.1 Surface hierarchy

- Page canvas is the tinted app canvas.
- Standard modules are opaque `surface-panel` or `surface-raised` cards.
- Keep one visually dominant module: Smart Restock.
- Do not make every card a gradient.
- Avoid barely visible glass cards on an almost identical background.
- Mobile modules stack with a consistent 12–16px vertical rhythm.
- Desktop retains its detailed grid and information density.

### 9.2 Smart Restock

Smart Restock may keep the existing green gradient because it is the principal action/insight.

Refine it so:

- Text contrast is strong.
- The icon has a deliberate light/dark plate.
- The CTA is visually distinct but not another competing saturated element.
- Dark mode uses a controlled green gradient without neon bloom.

### 9.3 Stats and summaries

- Use semantic pale surfaces instead of identical white boxes where meaning supports it.
- Do not use a different strong colour for every stat.
- Expiring/urgent values may use amber/coral.
- Pantry/healthy values may use green.
- Nutrition/hydration may use blue/teal.
- Neutral operational values remain sage-grey.

### 9.4 Lists

Food Log and Recent Purchases should:

- Read as one grouped raised surface each.
- Use internal spacing and light separators.
- Avoid giving each row a separate floating card.
- Keep primary row text darker/brighter than metadata.
- Preserve full row tap targets.

---

## 10. Mobile shell and overlays

Primary files:

- `src/components/layout/PhoneHeader.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/layout/QuickAddSheet.tsx`
- `src/components/layout/MoreSheet.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/drawer.tsx`

### 10.1 Phone header

- Keep the compact title and group switcher.
- No mobile hamburger.
- Use the raised/floating surface treatment with a soft lower border.
- Maintain notch/Dynamic Island safe-area padding.
- Ensure content scrolling beneath the translucent header remains legible.

### 10.2 Bottom navigation

Keep the current Home / Pantry / Quick Add / Shopping / More model.

Refine:

- Near-opaque raised surface in light and dark modes.
- Thin top border.
- Soft upward depth, especially in dark mode.
- Inactive icons use muted foreground with adequate contrast.
- Active icon/label uses primary green.
- Quick Add retains its green gradient and circular shape.
- Quick Add halo must be controlled, not neon.
- Preserve home-indicator safe-area padding.

The central Quick Add button is the Shelf Control equivalent of Noon’s distinctive central navigation action. Keep it product-specific and functional.

### 10.3 Quick Add and More sheets

- Use the same raised-surface system as cards.
- Maintain `dvh` and safe-area behaviour.
- Ensure all labels remain readable without truncation at normal sizing.
- “Pantry Intelligence” must not truncate in the standard mobile sheet.
- At 200% text, allow rows to grow or switch the More grid to one column.
- Keep minimum 44px row targets.
- Do not use promotional graphics.

---

## 11. Dark mode requirements

Dark mode is not an inverted light theme.

### Required qualities

- Three clear dark surface levels are visible.
- Avoid pure black for all surfaces.
- Cards are distinguished through tone, border, and subtle top-edge highlight.
- Shadows are restrained because they contribute little on dark backgrounds.
- Product media wells illuminate imagery locally.
- White packaging does not float directly on black.
- Green remains the primary brand accent but does not tint every surface.
- Semantic amber, coral, blue/teal, and violet remain distinguishable.
- Text and icons meet contrast requirements.
- Disabled states remain visibly disabled without becoming unreadable.

Suggested dark media well:

```css
background:
  radial-gradient(
    circle at 50% 28%,
    hsl(150 22% 23% / 0.75) 0%,
    transparent 56%
  ),
  linear-gradient(
    160deg,
    hsl(var(--media-well-start)) 0%,
    hsl(var(--media-well-mid)) 58%,
    hsl(var(--media-well-end)) 100%
  );
```

Use this as a direction, not an excuse to create a visible spotlight behind every element.

---

## 12. Profile, Shopping, Nutrition, and Intelligence follow-through

After Dashboard and Pantry are accepted, extend the same tokens—not new designs—to other screens.

### Profile and Settings

- Group related fields/actions into clear raised panels on the tinted canvas.
- Use two-column quick-action tiles only where the actions are genuinely peers.
- Do not add marketing panels.

### Shopping

- Consider a contextual sticky summary/action surface above the bottom navigation when there is a meaningful total or bulk action.
- It must not permanently consume space when there is no active action.
- Respect the home-indicator and bottom-nav offsets.

### Nutrition

- Use a restrained blue/teal semantic tint for selected summaries and progress.
- Keep data visualizations legible in both themes.
- Do not recolour the entire Nutrition screen blue.

### Intelligence

- Use a restrained violet/green intelligence accent.
- Keep recommendation cards on standard surface tokens.
- Do not make AI content visually louder than urgent pantry states.

---

## 13. Responsive behaviour

Test these widths:

- 320px.
- 375px.
- 390px.
- 430px.
- 768px tablet.
- 1024px tablet/desktop boundary.
- 1440px desktop.

Requirements:

- No unintended horizontal page scrolling.
- Three Pantry cards remain usable on phone.
- Long names do not overlap quantities or badges.
- Bottom navigation labels remain visible.
- Sheet content scrolls internally when required.
- Landscape phone remains usable with a coarse pointer.
- Desktop sidebar/top bar and information density remain intact.
- Surface tokens must improve desktop too, without making it resemble a stretched mobile layout.

---

## 14. Accessibility and interaction requirements

- Meaningful text contrast: WCAG AA.
- Minimum 44×44px touch target for primary/required actions.
- Inputs remain at least 16px on touch devices.
- Visible keyboard focus rings.
- Entire Pantry card remains keyboard operable.
- Icon-only actions have accessible names.
- Status is not communicated by colour alone.
- Test long text and 200% browser text scaling.
- Check VoiceOver reading order for:
  - Pantry card.
  - Quick Add.
  - More sheet.
  - Sticky contextual actions.
- Preserve `prefers-reduced-motion`.
- Press feedback may use a restrained `scale(0.98)`/opacity change, but avoid hover animations that stick on touch devices.

---

## 15. Performance requirements

- No new UI framework.
- No heavy gradient/image library.
- No new fonts.
- No decorative high-resolution background images.
- Use CSS tokens and gradients.
- Avoid backdrop blur on every card; reserve blur for fixed navigation, headers, and overlays.
- Do not worsen the existing bundle-size warning.
- Use existing lazy-loading/image behaviour where available.

---

## 16. Implementation sequence

### Phase A — source reconciliation

1. Reconcile Lovable `bbe2323` with GitHub.
2. Confirm three-column Pantry is present.
3. Run baseline tests/build.

### Phase B — tokens and primitives

1. Add light/dark surface tokens.
2. Add reusable surface and media-well utilities.
3. Add semantic soft-status variants.
4. Apply canvas treatment in `AppLayout`.
5. Verify light/dark rendering before changing screens.

Suggested commit:

```text
style: add layered light and dark surface system
```

### Phase C — Pantry pilot

1. Apply the media well.
2. Simplify phone card content.
3. Preserve detailed tablet/desktop content.
4. Resolve overlay badge collisions.
5. Ensure all actions remain reachable.
6. Validate three columns at all phone widths.

Suggested commit:

```text
style: refine mobile pantry card hierarchy
```

### Phase D — Dashboard pilot

1. Replace flat/glass-like mobile modules with clear surface roles.
2. Preserve Smart Restock as the main accent.
3. Apply consistent grouped-list treatment.
4. Verify tablet and desktop grids are unchanged functionally.

Suggested commit:

```text
style: strengthen dashboard surface hierarchy
```

### Phase E — shell and sheets

1. Refine PhoneHeader and MobileBottomNav surfaces.
2. Refine Quick Add and More sheets.
3. Fix long-label and 200%-text behaviour.

Suggested commit:

```text
style: polish mobile navigation and sheets
```

### Phase F — follow-through

Apply existing tokens to Profile, Shopping, Nutrition, and Intelligence. Do not invent additional independent visual systems.

---

## 17. Verification matrix

For each checkpoint, inspect light and dark mode.

| Screen/state | Phone | Tablet | Desktop |
|---|---:|---:|---:|
| Dashboard top | Required | Required | Required |
| Dashboard long-scroll content | Required | Required | Required |
| Pantry with real images | Required | Required | Required |
| Pantry missing images | Required | Required | Required |
| Pantry long product names | Required | Required | Required |
| Pantry expired/expiring/opened/no-location | Required | Required | Required |
| Quick Add sheet | Required | Optional | N/A |
| More sheet, including long labels | Required | Optional | N/A |
| Shopping contextual action | Required | Required | Required |
| Profile grouped surfaces | Required | Required | Required |

Also test:

- 200% text.
- Reduced motion.
- Keyboard navigation.
- iPhone portrait.
- iPhone landscape if a real/coarse-pointer device is available.
- No image.
- Transparent product PNG.
- Very bright/white product packaging.
- Very dark product image.
- Extremely long name and brand.

---

## 18. Automated checks

Run:

```bash
npm test
npm run build
```

Run lint on changed files or the project’s normal lint command. Do not introduce new lint violations.

If E2E/Playwright remains unavailable because of the missing configuration package, record that limitation explicitly rather than claiming E2E coverage.

Capture final comparison screenshots for:

- Dashboard light.
- Dashboard dark.
- Pantry light.
- Pantry dark.
- More sheet at standard text size.
- More sheet at 200% text.
- Desktop Dashboard and Pantry regression views.

---

## 19. Definition of done

This pass is complete when:

- Lovable and GitHub are synchronized.
- Light mode has a visibly tinted canvas and distinct white content surfaces.
- Dark mode has at least three distinguishable surface levels without using universal pure black.
- Pantry shows three cards per row on phone without unreadably small text.
- Pantry product names can use two lines.
- Product images sit in consistent gradient media wells.
- Important product packaging is not aggressively cropped.
- Card overlays do not collide.
- All Pantry actions remain accessible.
- Dashboard cards have clear hierarchy rather than blending into the page.
- Smart Restock remains the only dominant gradient module.
- Bottom navigation and sheets use the new surface system.
- More sheet labels do not truncate at normal text size.
- 200% text remains functional.
- No required touch target is undersized.
- No mobile hamburger is introduced.
- Desktop layout and functionality remain intact.
- Light and dark modes both pass the visual matrix.
- Tests and production build pass.
- No backend/auth/Supabase/SSRF code was altered.

---

## 20. Final design test

The design should pass this simple test:

> If all text and images were temporarily blurred, could a user still distinguish the page canvas, content sections, image areas, interactive controls, and primary action?

If everything still blends into one pale or dark plane, the surface hierarchy is too weak.

If every section appears to float independently, glows, or competes for attention, the hierarchy is too strong.

The target is calm, layered, useful, and unmistakably Shelf Control.
