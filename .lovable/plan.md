

# Purchases Page — Premium Receipt-Style Redesign

## Overview

Transform the flat list-style Purchases page into a premium "financial + behavioral intelligence layer" with a receipt-inspired visual metaphor, split-panel layout, and summary intelligence cards — consistent with the Pantry and Analytics visual system.

## Files to Change

| File | Change |
|---|---|
| `src/pages/Purchases.tsx` | Full redesign: summary cards, split layout (trips list + receipt detail panel), intelligence strip |
| `src/components/purchases/PurchaseCard.tsx` | Replace with `TripCard` — compact receipt-style trip card for the left panel |
| `src/components/purchases/ReceiptDetail.tsx` | **New** — right panel receipt detail view with torn-edge effect, dashed separators, monospace alignment |

No backend changes. No changes to other pages. Existing hooks and dialogs (Add/Edit/Delete) remain untouched.

## Page Structure

```text
┌──────────────────────────────────────────────────────┐
│  Purchases                              [+ Log Purchase] │
│  Track your household shopping history                    │
├──────────────────────────────────────────────────────┤
│  SUMMARY CARDS (4)                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │Total Spend│ │  Stores  │ │Avg/Trip  │ │Best Value│    │
│  │ AED 961  │ │    4     │ │ AED 96   │ │Chickpeas │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
├──────────────────────────────────────────────────────┤
│  LEFT (5/12)            │  RIGHT (7/12)                  │
│  ┌─────────────────┐    │  ┌────────────────────────┐    │
│  │ RECENT TRIPS     │    │  │ ~~~ torn edge ~~~      │    │
│  │                  │    │  │  RECEIPT DETAIL         │    │
│  │ ┌──────────────┐ │    │  │                        │    │
│  │ │ Careem Quik  │ │    │  │  Store: Careem Quik    │    │
│  │ │ Apr 14       │ │◄──│  │  Date: Apr 14, 2024    │    │
│  │ │ AED 96.11    │ │    │  │  ─ ─ ─ ─ ─ ─ ─ ─ ─   │    │
│  │ │ 3 items      │ │    │  │  Choc Tea Cake  18.75  │    │
│  │ └──────────────┘ │    │  │  Marble Cake    16.90  │    │
│  │                  │    │  │  ─ ─ ─ ─ ─ ─ ─ ─ ─   │    │
│  │ ┌──────────────┐ │    │  │  TOTAL      AED 96.11  │    │
│  │ │ Lulu         │ │    │  │  ~~~ torn edge ~~~     │    │
│  │ └──────────────┘ │    │  │                        │    │
│  └─────────────────┘    │  │  [Edit] [Delete]        │    │
│                         │  └────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

On **mobile**: stacks vertically — trips list on top, receipt detail below when a trip is tapped.

## Key Design Details

### 1. Summary Cards (4 across)
Computed from purchases data:
- **Total Spend**: sum of all purchase totals
- **Total Stores**: count of distinct store names
- **Avg Spend/Trip**: total / trip count
- **Best Value Item**: item with best protein-per-AED (reuse logic from analytics)

Style: `rounded-2xl`, soft shadow, icon-led, Outfit font, consistent with Pantry/Analytics cards.

### 2. Trip Cards (Left Panel)
Each purchase becomes a compact card showing:
- Store name (bold) or "No store" (muted italic)
- Date + time
- Total spend (large, right-aligned)
- Item count badge
- First 2-3 item names as preview text
- **Active state**: primary-colored left border + slight elevation when selected

Clicking a trip card selects it and shows its receipt detail on the right.

### 3. Receipt Detail Panel (Right, NEW component)
The signature visual element. Styled like a real receipt:
- **Off-white background** (`bg-[#FCFBF9]` or similar warm tone)
- **Torn/zigzag edge** at top via CSS `clip-path` or SVG — subtle, not cartoonish
- **Dashed separators** between sections (`border-dashed`)
- **Content sections**:
  - Store header (centered, receipt-style)
  - Date
  - Dashed line
  - Item rows: name left-aligned, price right-aligned, monospace-feel alignment using `tabular-nums`
  - Quantity + unit shown subtly under each item name
  - Expiry badge if set
  - Dashed line
  - **Total** line: bold, larger
  - Notes section if present
- **Bottom**: Edit + Delete buttons (existing logic preserved)
- **Empty state**: "Select a trip to view the receipt" placeholder

### 4. State Management
- `selectedPurchaseId` state in `Purchases.tsx`
- Default: first purchase selected (or none if empty)
- Clicking a trip card updates selection
- Receipt panel reads from the selected purchase object

### 5. Visual Style
- **Font**: `Outfit` (consistent with Pantry/Analytics)
- **Cards**: `rounded-2xl`, `shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)]`
- **Receipt**: warmer off-white, `rounded-2xl`, dashed internal lines
- **Numbers**: `tabular-nums font-semibold` for all monetary values
- **Active trip**: `border-l-4 border-primary shadow-md`

### 6. Mobile Layout
- Grid collapses to single column
- Trip cards stack vertically
- Tapping a trip expands the receipt detail inline (or scrolls to it below)
- Summary cards: 2x2 grid on mobile

## Assumptions
- No new data hooks needed — all data comes from existing `usePurchases()`
- Add/Edit/Delete dialogs remain unchanged (triggered from receipt panel buttons)
- "Best Value" card reuses simple computation from purchase items with nutrition data
- Torn edge is CSS-only (clip-path zigzag), no image assets

