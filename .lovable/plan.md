

# Pantry Page Premium Redesign

## What Changes

Redesign `Pantry.tsx` and `InventoryCard.tsx` to create a premium inventory workspace. No changes to other pages, sidebar, or data logic.

## Page Structure

```text
┌──────────────────────────────────────────────────┐
│  Pantry                          [+ Add to Pantry]│
│  42 items in stock                                │
├──────────────────────────────────────────────────┤
│  [All] [Fridge] [Pantry] [Freezer] [Counter] [Other] │  ← location pill tabs
│                                                      │
│  [🔍 Search...]  [Category ▾]                        │
├──────────────────────────────────────────────────┤
│  INTELLIGENCE STRIP                                  │
│  ┌─────────┐ ┌─────────────┐ ┌─────────┐ ┌───────┐ │
│  │ Use Soon │ │Expiring Soon│ │ Expired │ │No Date│ │
│  │    6     │ │      3      │ │    2    │ │  14   │ │
│  └─────────┘ └─────────────┘ └─────────┘ └───────┘ │
├──────────────────────────────────────────────────┤
│  ⛔ EXPIRED (2)                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Yogurt     Dairy    Fridge   500g   Exp 2d ago│  │
│  │ Bread      Grains   Counter  1 Loaf Exp 1d ago│  │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ⚠️ EXPIRING SOON (3)                               │
│  ┌──────────────────────────────────────────────┐   │
│  │ Milk       Dairy    Fridge   1L     2d left   │  │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ✅ FRESH (23)                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │ Rice       Grains   Pantry   2kg    45d left  │  │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ── NO EXPIRY (14)                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ Salt       Spices   Pantry   1kg    No expiry │  │
│  └──────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│  ▸ Item Catalog (unchanged)                         │
└──────────────────────────────────────────────────┘
```

## Files to Change

| File | Change |
|---|---|
| `src/pages/Pantry.tsx` | Full redesign: add location tabs, intelligence strip, grouped sections |
| `src/components/pantry/InventoryCard.tsx` | Richer card: shadows, hover actions, stronger hierarchy, brand display |

No other files change.

## Key Implementation Details

### 1. Location Pill Tabs
Horizontal row of pill buttons replacing the dropdown as primary location filter. The dropdown is removed. Active pill gets primary bg color, others are muted.

### 2. Intelligence Strip
4 summary cards computed from `filtered` inventory using `getExpiryStatus`:
- **Use Soon** (expiring within 3 days) -- amber accent
- **Expired** -- red accent  
- **Fresh** -- green accent
- **No Expiry Set** -- gray

Each card: icon + count + label, rounded-2xl, soft shadow.

### 3. Grouped Sections
Items grouped by expiry status into collapsible sections with colored headers:
- Expired (red left border, red header text)
- Expiring Soon (amber)
- Fresh (green)
- No Expiry (gray)

Empty sections are hidden. Each section header shows count.

### 4. Richer Inventory Card
- `rounded-2xl` with `shadow-sm hover:shadow-md` transition
- Left: item name (font-semibold, larger), brand (if exists, muted), category pill, location with icon
- Right: quantity + unit (large, tabular-nums), expiry status pill
- Hover state reveals subtle Edit/Consume/Discard action row at bottom of card
- Left color accent strip (4px) matching expiry status

### 5. Visual Style
- Soft warm background inherited from app (`--background`)
- Cards: white, `rounded-2xl`, `shadow-sm`, no harsh borders
- Better spacing: `gap-3` between cards, `gap-6` between sections
- Section headers: uppercase small text with status color dot
- Numbers: `tabular-nums font-semibold` for quantities

### Assumptions
- "Consume" and "Discard" hover actions are visual placeholders (no new backend wiring needed -- they open the edit dialog for now)
- ItemCatalogSection remains unchanged at bottom
- Existing search + category filter logic preserved
- No schema changes needed

