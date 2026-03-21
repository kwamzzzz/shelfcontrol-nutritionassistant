

# Analytics Layer — Refined Premium Intelligence Workspace

## Refinements Applied

### 1. Stronger Hero Hierarchy
Each tab gets one **dominant hero module** that is visually larger than the other KPI cards. Not all cards are equal.

```text
┌─────────────────────────────────────────────┐
│  DOMINANT HERO (full width, p-8, text-4xl)  │
│  e.g. "Calories Today: 1,842"              │
└─────────────────────────────────────────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│ KPI card │ │ KPI card │ │ KPI card │  (smaller, p-5, text-2xl)
└──────────┘ └──────────┘ └──────────┘
```

- **Overview dominant**: "This Month's Spend" — large card with month total, trip count, and avg per trip inside one card
- **Food & Pantry dominant**: "Pantry Nutrient Availability" — full-width macro bars module
- **Consumption dominant**: "Consumption Timeline" — full-width featured log list
- **Spend & Value dominant**: "Your Best Value This Month" — a single featured insight card (e.g. "Lentils gave you 42g protein/AED — your best value food") rather than jumping straight to tables

### 2. Insights Rail — Three Visual Buckets

Instead of a flat bullet list, the right rail groups insights into three severity sections:

```text
┌─────────────────────────┐
│  🔴  ACT NOW            │
│  ─────────────────────  │
│  • 3 items expired      │
│  • Opened yogurt: 5d    │
│                         │
│  🟡  WATCH              │
│  ─────────────────────  │
│  • Protein supply low   │
│  • 4 items no expiry    │
│                         │
│  🟢  GOOD NEWS          │
│  ─────────────────────  │
│  • Spending down 12%    │
│  • Strong calcium stock │
└─────────────────────────┘
```

Each bucket has a colored header bar (red/amber/green) and only renders if it has items. Empty buckets are hidden.

### 3. Recent Food Activity on Overview

Add a **"Recent Activity"** module to the Overview tab showing the last 5 consumption events (item name, quantity, time ago). This makes Overview feel alive and connected to real household behavior. Sits as a supporting module below the featured modules.

### 4. Expiry Risk and Waste Summary Separated

Two distinct modules instead of one combined block:

- **Expiry Risk** (amber accent): Items expiring soon count, expired count, items with no expiry set. Future-facing risk.
- **Waste Summary** (red accent): Total items discarded this month, estimated value lost. Realized loss. Shows "No waste data yet" placeholder until `waste_logs` table exists.

### 5. Spend & Value — Featured Insight First

The tab opens with a **"Best Value Insight"** hero module — a single plain-English statement like "Your most cost-efficient protein source this month is Lentils at 42g/AED." Below that, supporting modules contain the store table and efficiency rankings.

---

## Per-Tab Final Layout

### Overview Tab
| Position | Module | Size |
|---|---|---|
| Dominant hero | This Month's Spend (total, trips, avg/trip in one large card) | Full width, `p-8` |
| KPI row | Items in Stock, Expiring Soon, Calories Today | 3 cards |
| Featured | Pantry Nutrient Availability (macro progress bars) | Large, col-span-8 |
| Supporting | Shopping Footprint | Half width |
| Supporting | Expiry Risk (amber) | Half width |
| Supporting | Waste Summary (red) — placeholder until waste_logs | Half width |
| Supporting | Recent Activity (last 5 consumption events) | Half width |
| **Rail** | Act Now / Watch / Good News insights | Right column |

### Food & Pantry Intelligence Tab
| Position | Module | Size |
|---|---|---|
| Dominant hero | Pantry Nutrient Availability (large macro bars + per-nutrient breakdown) | Full width |
| KPI row | Total inventory, Expiring, Expired, No expiry set | 4 cards |
| Supporting | Expiry Risk list (items expiring ≤3 days) | Half width |
| Supporting | Consumption Velocity (fast/medium/slow badges) | Half width |
| Supporting | Time-to-Consumption (avg days, top items) | Half width |
| Placeholder | Opened-State Risk (Phase 2) | Half width |
| **Rail** | "Use First / At Risk" prioritized items | Right column |

### Consumption & Health Patterns Tab
| Position | Module | Size |
|---|---|---|
| Dominant hero | Consumption Timeline (date-grouped log list) | Full width, large |
| KPI row | Logs this week, Avg daily cal, Avg daily protein | 3 cards |
| Supporting | Consumption Velocity badges (top items) | Half width |
| Placeholder | Nutrient Diversity (Phase 2) | Half width |
| Placeholder | Recall Export (Phase 2) | Half width |
| **Rail** | Pattern summaries ("Dairy consumed 4x this week", etc.) | Right column |

### Spend & Value Tab
| Position | Module | Size |
|---|---|---|
| Dominant hero | Best Value Insight — plain-English featured finding | Full width, `p-8` |
| KPI row | Month spend, Week spend, Avg per trip | 3 cards |
| Featured | Store Breakdown table (visits, spend, avg/visit) | Large |
| Supporting | Spend vs Nutrition Efficiency rankings | Half width |
| Supporting | Top Purchased / Most consumed | Half width |
| **Rail** | Value insights ("Best protein/AED store", spending notes) | Right column |

---

## Component Structure

### New Files
| File | Purpose |
|---|---|
| `src/components/analytics/AnalyticsLayout.tsx` | 2-column grid (main `lg:col-span-8` + rail `lg:col-span-4`), collapses on mobile |
| `src/components/analytics/HeroStatCard.tsx` | Two variants: `dominant` (full-width, large text) and `standard` (smaller KPI card) |
| `src/components/analytics/AnalyticsModule.tsx` | White rounded card wrapper with title, optional accent color strip |
| `src/components/analytics/InsightsRail.tsx` | Right column with 3 bucketed sections (Act Now, Watch, Good News) |
| `src/components/analytics/InsightItem.tsx` | Single insight row with left color border |
| `src/components/analytics/FilterBar.tsx` | Date range selector (week/month/custom) |
| `src/components/analytics/OverviewTab.tsx` | Overview tab content |
| `src/components/analytics/FoodPantryTab.tsx` | Food & Pantry Intelligence tab |
| `src/components/analytics/ConsumptionHealthTab.tsx` | Consumption & Health tab |
| `src/components/analytics/SpendValueTab.tsx` | Spend & Value tab |
| `src/hooks/useAnalytics.ts` | Centralized memoized computations + insight generation |

### Insight Generation Types
```typescript
type InsightSeverity = "act_now" | "watch" | "good_news";
type Insight = { severity: InsightSeverity; title: string; body: string; tab: string[] };
```

Insights are computed in `useAnalytics` and filtered per-tab.

---

## Schema Migration

Single migration adding:
- **`waste_logs`** table: `id`, `user_id`, `item_id`, `inventory_id` (nullable), `purchase_id` (nullable), `quantity`, `unit`, `discarded_at`, `reason` (text: expired/spoiled/leftover/other), `note` — with RLS policy for authenticated users on own rows
- **`items`** additions: `fiber_g`, `sugar_g`, `sodium_mg`, `serving_size`, `nutrition_basis` (all nullable numeric/text)
- **`inventory`** additions: `sealed_status` (text, nullable), `opened_date` (date, nullable)
- **`consumption_logs`** additions: `unit` (text, nullable), `meal_type` (text, nullable), `note` (text, nullable)

---

## Build Order

1. Schema migration (waste_logs table + field additions)
2. `useAnalytics.ts` hook — all MVP computations + insight generation with 3-bucket severity
3. Shared components: `AnalyticsLayout`, `HeroStatCard` (dominant + standard variants), `AnalyticsModule`, `InsightsRail`, `InsightItem`, `FilterBar`
4. **OverviewTab** — sets the visual standard, includes Recent Activity
5. **SpendValueTab** — featured insight hero + store table
6. **FoodPantryTab** — dominant nutrient availability + risk modules
7. **ConsumptionHealthTab** — dominant timeline + velocity
8. Wire tabs into `Analytics.tsx`, replace current flat layout
9. Polish pass

---

## Assumptions

- No charting library — macro visualization uses CSS progress bars
- Insights are deterministic (data-computed), not AI-generated
- Phase 2 sections get clean "Coming soon" placeholder cards
- `waste_logs` starts empty; Waste Summary shows placeholder until a Discard action is built on Pantry page (separate task)
- Mobile: 2-column layout collapses to single column, insights rail stacks below
- Existing data hooks reused inside `useAnalytics`

