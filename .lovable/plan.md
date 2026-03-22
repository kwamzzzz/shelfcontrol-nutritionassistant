

# Pantry Intelligence — News Feed Redesign

## Summary

Transform the current list-based Intelligence page into a modern news-app-style card grid with image placeholders, editorial typography, search, and category tabs. Also update the Dashboard widget styling.

## Files to Change

| File | Change |
|---|---|
| `src/pages/Intelligence.tsx` | Full rewrite: news grid layout, search bar, image cards |
| `src/hooks/useIntelligenceFeed.ts` | Add `image` placeholder URL and `source` field to FeedItem |
| `src/components/dashboard/IntelligenceWidget.tsx` | Minor refresh to match new card style |

## FeedItem Type Update

Add two fields to the `FeedItem` interface:
- `source: string` — e.g. "Based on your pantry", "Based on your purchases", "Based on your waste pattern"
- `image: string` — placeholder gradient/color keyed by category (CSS gradient, not real images)

Each rule in the hook already has `reason` — rename usage to `source` for display, or add `source` as a separate field derived from tags/category.

## Intelligence Page Layout

```text
┌──────────────────────────────────────────────────────┐
│  Pantry Intelligence                    [🔍 Search...]│
│  Personalized insights for your kitchen               │
├──────────────────────────────────────────────────────┤
│  [All] [Alerts] [Nutrition] [Spending] [Patterns] [Seasonal] │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ ░░IMAGE░░ │  │ ░░IMAGE░░ │  │ ░░IMAGE░░ │          │
│  │           │  │           │  │           │          │
│  │ ALERTS    │  │ NUTRITION │  │ SPENDING  │          │
│  │ Title...  │  │ Title...  │  │ Title...  │          │
│  │ source+ts │  │ source+ts │  │ source+ts │          │
│  │ desc...   │  │ desc...   │  │ desc...   │          │
│  │ [🔖] [✕]  │  │ [🔖] [✕]  │  │ [🔖] [✕]  │          │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  ...      │  │  ...      │  │  ...      │          │
│  └──────────┘  └──────────┘  └──────────┘           │
└──────────────────────────────────────────────────────┘
```

- **3 columns** desktop, **2 columns** tablet, **1 column** mobile
- Category tabs: sticky on mobile

## Card Design

Each card structure (top to bottom):
1. **Image area** — tall rectangle (`aspect-[16/10]`, `rounded-t-2xl`), filled with a category-specific gradient (e.g. alerts = warm red gradient, nutrition = green, spending = blue, patterns = purple, seasonality = emerald)
2. **Severity badge** — overlaid top-right on image (small colored pill)
3. **Category label** — small uppercase text below image
4. **Title** — `text-lg font-semibold`, 2 lines max (line-clamp-2)
5. **Source + time** — small muted text: "Based on your pantry · Just now"
6. **Description** — `text-sm text-muted-foreground`, 2-3 lines (line-clamp-3)
7. **Tags row** — small pills
8. **Action row** — Bookmark + Dismiss icons, visible on hover

Style: `rounded-2xl`, `shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all`, `bg-card`

## Search

- Search input filters cards by title/description text match
- Placed in header row, right-aligned
- Uses existing `Input` component with search icon

## Category-Specific Gradients

```typescript
const CATEGORY_GRADIENT: Record<FeedCategory, string> = {
  alerts: "from-red-500/80 to-orange-400/60",
  nutrition: "from-emerald-500/80 to-teal-400/60",
  spending: "from-blue-500/80 to-indigo-400/60",
  patterns: "from-purple-500/80 to-violet-400/60",
  seasonality: "from-amber-500/80 to-lime-400/60",
};
```

Each image area: `bg-gradient-to-br ${gradient}` with a large category icon centered (semi-transparent white).

## Dashboard Widget Update

Minor: make widget cards show the category gradient strip on the left instead of the current icon circle, for visual consistency. Keep the existing layout otherwise.

## Build Order

1. Update `FeedItem` type + add `source`/`image` fields to all rules
2. Rewrite `Intelligence.tsx` with grid + cards + search
3. Refresh `IntelligenceWidget.tsx`

