# Shelf Control Mobile Optimization — Implementation Handoff

## How to use this document

This is the implementation brief and source of truth for optimizing Shelf Control for mobile, especially iPhone, while preserving the desktop experience.

Implement the work rather than returning another high-level design review. Work through the phases in order, inspect the existing implementation before changing each area, and preserve unrelated user changes. Do not push, deploy, modify Supabase functions, or change database schemas unless separately instructed.

If the entire brief cannot be completed safely in one pass:

1. Finish and verify the current phase.
2. Leave the repository in a working state.
3. Report completed work, tests, screenshots, and remaining phase items precisely.

## Repository and current state

- Repository root:
  `/Users/kwame/Documents/Codex/2026-07-23/shelf-control-handover-2026-07-22/repo`
- Current application stack:
  - Vite
  - React 18
  - TypeScript
  - React Router
  - Tailwind CSS
  - shadcn/Radix UI
  - Supabase
  - TanStack Query
  - Recharts
  - Vitest and Testing Library
  - Playwright using the Lovable fixture/config
- The repository was clean on `main` at the time this handoff was written.
- The `import-recipe` Supabase function was recently hardened for authentication and SSRF. Do not weaken, bypass, or refactor that security work as part of the responsive redesign.
- No database migration, Edge Function change, authentication change, or data-contract change is required for this task.

### Existing routes

Public:

- `/auth`
- `/invite/:token`

Protected:

- `/`
- `/pantry`
- `/shopping`
- `/purchases`
- `/recipes`
- `/recipes/:id`
- `/consumption`
- `/analytics`
- `/pantry-intelligence`
- `/food-intelligence`
- `/nutrition`
- `/coach`
- `/groups`
- `/groups/:id`
- `/invitations`
- `/challenges`
- `/profile`
- `/settings`

### Existing implementation observations

- `src/App.tsx` owns the route tree.
- `AppLayout` currently switches to a persistent sidebar at Tailwind `sm` (640px).
- `use-mobile.tsx` considers mobile to be below 768px. This conflicts with the shell’s current 640px switch and must be reconciled.
- The mobile shell currently uses a fixed top bar and hamburger drawer containing the complete desktop navigation.
- Desktop uses a collapsible sidebar and top toolbar.
- There is no bottom navigation, `viewport-fit=cover`, safe-area CSS contract, `dvh` shell, or consistent reduced-motion behavior.
- Several icon buttons are only 24–32px.
- Some edit/delete controls are only visible on hover.
- Many forms use three- or four-column base grids that become cramped on phones.
- Several sticky sections use `top-0` even though a fixed phone header is present.
- The Coach view uses `100vh`, which is unreliable with the iPhone browser chrome and software keyboard.
- Shared Dialog and AlertDialog content lacks a consistent phone max-height, internal scrolling, safe-area, and keyboard strategy.
- `AddPurchaseDialog` includes a bulk-review table with `min-width: 720px`; this needs a mobile editing presentation.
- The existing PWA manifest has standalone mode but only static white theme/background colors.
- Fonts are loaded through more than one mechanism. Keep the current Inter/Fraunces brand direction and remove duplicate loading.
- Existing component and Playwright test infrastructure should be extended rather than replaced.
- The full repository lint currently has substantial pre-existing debt. Do not expand this task into a global lint cleanup. Changed files must introduce no new lint violations.

## Outcome and non-negotiable requirements

The result must feel like one unified product:

- Detailed and efficient on desktop.
- Focused, predictable, and comfortable one-handed on iPhone.
- Responsive, not a separate mobile application.
- Visually consistent with the current fresh-green light/dark design.
- Feature-complete at every supported size.

Do not:

- Remove a feature because it is difficult to fit on mobile.
- hide a frequent action more than one navigation level deep.
- turn the application into an unrelated iOS visual clone.
- replace the current component framework.
- rely on hover for required functionality.
- use swipe as the only way to complete or delete something.
- preserve desktop tables on phone merely by shrinking their typography.
- make broad backend, security, schema, or business-logic changes.
- push, merge, or deploy without a separate explicit instruction.

## Design basis

Use these current platform principles as implementation guidance:

- Apple recommends stable tab bars and a More destination when available width cannot expose every section:
  <https://developer.apple.com/design/human-interface-guidelines/tab-bars>
- Prefer approximately 44×44px touch areas for custom controls:
  <https://developer.apple.com/design/human-interface-guidelines/buttons>
- WCAG 2.2 requires at least 24×24 CSS pixels or adequate spacing, but Shelf Control should use 44×44px for normal phone controls:
  <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum>
- Layouts and meaningful icons must continue to work at increased text sizes:
  <https://developer.apple.com/design/human-interface-guidelines/typography>
- Use persistent labels, suitable keyboard types, sensible defaults, inline validation, and selection controls instead of unnecessary typing:
  <https://developer.apple.com/design/human-interface-guidelines/entering-data>
- Use `viewport-fit=cover` and all four `safe-area-inset-*` values where content extends to the iPhone edges:
  <https://webkit.org/blog/7929/designing-websites-for-iphone-x/>

## Responsive layout contract

### Content breakpoints

Use breakpoints based on layout capacity:

| Range | Content behavior |
| --- | --- |
| `<640px` | Compact phone, 16px side gutters, single-column content |
| `640–767px` | Wide phone; phone shell remains, with two-column cards only when each card remains readable |
| `768–1023px` | Tablet content, generally 24px gutters and up to two or three columns |
| `1024–1279px` | Desktop sidebar and multi-column layouts |
| `≥1280px` | Wide desktop, full 12-column dashboard and maximum useful density |

Do not determine the shell from width alone. A landscape iPhone can exceed 768 CSS pixels while having very little height.

Required shell-mode behavior:

```ts
type ResponsiveShellMode = "phone" | "tablet" | "desktop";
```

- Phone:
  - width below 768px, or
  - coarse pointer with viewport height below 600px.
- Tablet:
  - width from 768px through 1023px,
  - unless it is a short coarse-pointer landscape viewport.
- Desktop:
  - width 1024px or greater,
  - unless it is a short coarse-pointer landscape viewport.

Implement this through one SSR-safe/mount-safe media-query hook and use it consistently. Remove or adapt the current competing mobile breakpoint logic.

### Required layout variables

Create a global, documented CSS contract equivalent to:

```css
--safe-top: env(safe-area-inset-top, 0px);
--safe-right: env(safe-area-inset-right, 0px);
--safe-bottom: env(safe-area-inset-bottom, 0px);
--safe-left: env(safe-area-inset-left, 0px);
--phone-header-height: 56px;
--phone-nav-height: 64px;
--tablet-rail-width: 68px;
--desktop-sidebar-width: 260px;
--desktop-sidebar-collapsed-width: 68px;
```

Use the variables rather than repeating magic numbers.

- Add `viewport-fit=cover` to the viewport metadata.
- Protect fixed headers and bottom navigation with the appropriate safe-area padding.
- Main phone content must end above:
  `phone navigation height + safe-area bottom`.
- Fixed and sticky content must not receive the same safe-area inset twice.
- Use a `100vh` fallback followed by `100dvh` for full-height mobile experiences.
- Account for left and right safe areas in phone landscape.
- Add light and dark `theme-color` metadata appropriate to the existing brand.

## Navigation contract

### Phone bottom navigation

Use five stable positions:

1. Home
2. Pantry
3. Add
4. Shopping
5. More

The Add control is a visually prominent action, not a route. It always opens the same Quick Add sheet:

- Log Purchase
- Log Consumption
- Add Pantry Item

Reuse existing workflows and mutations. If existing dialogs only support internal triggers, refactor them to accept controlled `open`/`onOpenChange` props rather than duplicating business logic.

### More navigation

More opens a safe-area-aware sheet with these groups:

Activity:

- Purchases
- Consumption
- Recipes

Intelligence:

- Analytics
- Pantry Intelligence
- Food Intelligence
- Nutrition
- Coach

Community:

- Groups
- Invitations
- Challenges

Account:

- Profile
- Settings

Display invitation/notification counts on More when relevant. Keep group switching available directly from the compact phone header.

### Route state

Centralize navigation metadata in a typed configuration rather than maintaining separate hand-authored desktop and mobile lists.

The model should cover:

```ts
interface AppNavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType;
  section: "primary" | "activity" | "intelligence" | "community" | "account";
  mobileSlot?: "home" | "pantry" | "shopping" | "more";
  activeFor?: string[];
}
```

Exact names may follow repository conventions, but there must be one source of truth.

Active-state rules:

- `/` selects Home.
- `/pantry` selects Pantry.
- `/shopping` selects Shopping.
- All More destinations select More.
- `/recipes/:id` inherits Recipes.
- `/groups/:id` inherits Groups.
- Add is never shown as a selected route.

Purchases must use `?trip=<id>` as selection state:

- On phones, the list and detail are separate visible states.
- Selecting a trip writes the query parameter.
- Back returns to the trip list.
- On desktop, the same selected ID drives the split view.
- Invalid or deleted IDs return safely to the list/default selection.

### Headers

Phone:

- Compact contextual header.
- Title or Back control.
- At most one visible contextual action.
- Secondary actions move to an overflow menu.
- Search belongs within relevant screens, not a permanently crowded global header.

Tablet:

- Compact rail.
- Reduced toolbar.
- Search or group controls appear only when space permits.

Desktop:

- Preserve the collapsible sidebar, full toolbar, search, group switcher, invitations, notifications, and account controls.

## Shared component rules

### Touch and interaction

- Normal phone controls must expose at least a 44×44px hit area.
- An icon can remain 16–20px visually while its button hit area is 44px.
- Adjacent destructive and constructive controls need clear spacing.
- Provide visible pressed, selected, disabled, loading, success, and error states.
- Touch devices must never require hover to reveal edit, delete, or primary actions.
- Disable hover-scale card effects on coarse pointers.
- Respect `prefers-reduced-motion`.
- Swipe can supplement a visible action, never replace it.

### Typography and spacing

- Use `rem`-based sizes and permit browser text scaling.
- Body and form text should normally be at least 16px on phones.
- Secondary labels may be 14px; avoid essential text below 12px.
- Use fluid headings where useful, but cap them so desktop headings do not become oversized.
- At 200% text scaling:
  - labels must wrap,
  - buttons must grow,
  - navigation labels must remain understandable,
  - essential values must not be truncated.
- Preserve Inter/Fraunces and existing design tokens in light and dark modes.
- Remove duplicate font requests and ensure a system-font fallback renders without layout shift.

### Page headers and actions

- One primary action remains visible on phone.
- Secondary actions move into an overflow menu or a clearly labeled expandable section.
- Desktop may retain the full action row.
- Do not allow page-title/action rows to create narrow, wrapped icon clusters.

### Filters and tabs

- Small filter sets may use horizontally scrolling chips.
- Provide a visible edge/overflow cue and keep the selected chip in view.
- Complex filters move into a Filter sheet with:
  - current-value summary,
  - Apply,
  - Clear,
  - accessible close behavior.
- Four or fewer short tabs may scroll horizontally.
- Large tab sets, including Nutrition’s seven sections, become an accessible mobile section selector.
- Tablet and desktop may retain visible tab bars.

### Forms

- Phone forms use one column.
- Tablet forms use no more than two columns unless fields are very short and clearly related.
- Desktop can retain efficient multi-column groups.
- Every input has a persistent label; placeholder text is supplemental.
- Use correct HTML types and attributes:
  - `type="email"`
  - `type="tel"`
  - suitable `inputmode`
  - `autocomplete`
  - `enterkeyhint`
- Inputs must render at 16px or larger on phone to avoid Safari focus zoom.
- Use locale-aware numeric formatting and do not discard partially entered decimal values.
- Validate inline at an appropriate time.
- Preserve all entered values when a submission fails.
- For long phone forms, use a keyboard-safe sticky submit region.
- Ensure the focused field and its validation message can scroll above the software keyboard.
- Prefer choices, pickers, recent values, and sensible defaults over unnecessary typing.

### Dialogs, drawers, alerts, and sheets

Use one content tree and responsive presentation:

- Short phone tasks: bottom sheet.
- Long forms and focused workflows: full-screen phone dialog.
- Tablet/desktop: centered dialog with an appropriate max width.
- Destructive alerts: explicit confirmation with the destructive action visually separated.

Every overlay must:

- fit within the usable `dvh`,
- account for safe areas,
- use internal scrolling instead of escaping the viewport,
- preserve focus trapping and Escape behavior,
- restore focus on close,
- keep its title and close action reachable,
- remain usable with the software keyboard,
- prevent background interaction and accidental double scrolling.

Do not swap between two separately mounted form trees at a breakpoint because that can lose state while open.

### Tables and dense information

Use responsive cards or rows for operational data:

- Primary identifier and status first.
- Most important numeric value visible.
- Primary action visible.
- Secondary fields expand inline.
- Sorting, search, filtering, and all data remain available.

Retain horizontal scrolling only for genuine comparison tables:

- Add an accessible table caption.
- Provide a visual horizontal-overflow cue.
- Keep the identifying column sticky where useful.
- Do not put the entire page in a horizontal scroller.

The purchase bulk-review experience must become editable mobile cards rather than relying on the current 720px minimum-width table.

### Charts and dashboards

- Put the human-readable summary before the visualization.
- Stack charts on phones.
- Keep legends concise and touch targets large.
- Reduce axis-label density rather than shrinking labels until unreadable.
- Use touch-friendly tooltips and an equivalent text summary.
- Preserve richer multi-chart desktop dashboards.
- Lazy-load expensive chart modules when they are not needed for the first phone render.

### Empty, loading, error, and offline states

Empty states must:

- name what is empty,
- explain why it matters when useful,
- provide the relevant next action,
- avoid excessive fixed vertical whitespace on short phones.

Loading states must reserve realistic final dimensions and avoid layout shifts.

Errors must:

- use plain language,
- preserve input,
- provide retry where safe,
- avoid hiding the rest of the page unnecessarily.

Mutation controls must prevent duplicate submissions and show progress without changing their label width dramatically.

### Toasts

- Position toasts above the bottom navigation and safe area on phone.
- Do not obscure sticky submit controls or the Coach composer.
- Desktop can retain bottom-corner placement.

## Screen-by-screen implementation requirements

### Dashboard

Keep:

- totals,
- alerts,
- AI insight,
- composition,
- spend trend,
- food log,
- recent purchases,
- visual identity.

Phone order:

1. Greeting/context.
2. Pantry or spending alerts requiring attention.
3. Key totals.
4. AI insight.
5. Spending trend and composition.
6. Food log and recent purchases.

Behavior:

- Single-column stack on compact phones.
- Two columns only where cards remain readable.
- Remove the desktop-only floating action panel on phone because Quick Add replaces it.
- Preserve full 12-column composition on wide desktop.
- Secondary explanatory content can collapse, but values and actions cannot disappear.

### Pantry

Keep:

- locations,
- month selection,
- categories,
- statistics,
- inventory,
- catalog,
- cleanup,
- shelf-life tools,
- add/edit flows.

Phone:

- Make Add Item the visible primary action.
- Place search and active-location control near the top.
- Make location/month/category chips intentionally scrollable.
- Move advanced filters and secondary tools into Filter/overflow sheets.
- Use one-column inventory rows/cards.
- Put item status, quantity, expiry urgency, and primary action first.
- Make any catalog table an expandable mobile collection.

Tablet:

- Two-column inventory.
- Compact summary grid.

Desktop:

- Preserve four-column inventory and full action/filter toolbar.

### Shopping

Keep:

- items,
- quantities,
- checked state,
- statistics,
- filters,
- add/edit/delete behavior.

Phone:

- Optimize for an in-store checklist.
- Use large full-width rows.
- Make completion toggles easy to reach one-handed.
- Keep Add and remaining count in a safe sticky region.
- Move complex filters into a sheet.
- Do not depend on hover to expose delete/edit.

Tablet/desktop:

- Restore two- and four-column layouts progressively.

### Purchases

Keep:

- trip history,
- receipt detail,
- totals,
- item editing,
- bulk paste,
- receipt scan,
- manual entry.

Phone:

- Show trip list or receipt detail, never both as one long stacked page.
- Use `?trip=<id>` for selection and Back behavior.
- Make totals and relevant actions sticky within safe bounds.
- Convert bulk-review rows into editable cards.
- Keep all three purchase-entry modes available.
- Ensure scanning, pasting, and manual entry remain keyboard- and viewport-safe.

Desktop:

- Preserve master-detail split view and sticky receipt panel.

### Consumption

Keep:

- daily totals,
- today and history logs,
- logging,
- filtering,
- edit/delete.

Phone:

- Show Today first.
- Use stacked log cards for earlier entries.
- Expose Quick Log through both the page action and global Add sheet.
- Put edit/delete into an explicit menu with confirmation for destructive action.

### Recipes

Keep:

- search,
- categories,
- sorting,
- sample generation,
- import,
- manual creation,
- recipe cards.

Phone:

- Search first.
- Horizontally scroll category chips.
- One-column recipe cards.
- One visible primary action.
- Import/sample/secondary actions move to overflow.
- Empty and import-error states must have a direct recovery action.

Desktop:

- Preserve four/five-column grid and full toolbar where space allows.

### Recipe Detail

Keep:

- hero,
- metadata,
- actions,
- ingredients,
- instructions,
- nutrition,
- cooking mode.

Phone:

- Compact the hero without losing title or important metadata.
- Present ingredients as a tappable checklist.
- Present instructions sequentially with clear step numbering.
- Collapse secondary nutrition details but keep them accessible.
- Make Start Cooking a safe sticky action.
- Cooking mode uses the usable `dvh`, large next/previous controls, and readable step text.

### Analytics

Keep:

- all tabs,
- date ranges,
- summaries,
- charts,
- tables,
- insights,
- search/filter/sort capabilities.

Phone:

- Summary metrics before charts.
- Stack charts.
- Reduce visual density while preserving exact values in accessible summaries/tooltips.
- Convert table-like operational rows into expandable cards.
- Use controlled horizontal scrolling only where comparisons would otherwise lose meaning.

Tablet:

- Two-column charts.

Desktop:

- Preserve main analysis region and sticky insights rail.

### Pantry Intelligence

Keep all scores, recommendations, filters, search, and actions.

Phone:

- Sticky search/filter area below the application header.
- Single-column cards.
- Important item actions always visible on touch.
- Secondary evidence or explanation expands within the card.

### Food Intelligence

Use the same collection behavior as Pantry Intelligence:

- searchable,
- filterable,
- one-column cards on phone,
- two columns on tablet,
- three/four on desktop,
- no hover-only actions,
- all evidence preserved through expansion.

### Nutrition

Keep:

- all seven sections,
- goals,
- daily logging,
- measurements,
- trends,
- charts,
- controls.

Phone:

- Replace the seven wrapped tabs with a labeled mobile section selector.
- Put today’s progress and primary logging action first.
- Use one-column controls/forms.
- Stack charts and summaries.
- Ensure numeric inputs present the correct keyboard.

Tablet/desktop:

- Restore visible tabs and multi-column panels.

### Coach

Keep conversation history, suggestions, generated responses, and composer.

Phone:

- Use the dynamic viewport rather than fixed `100vh`.
- Compact contextual header.
- Message region owns scrolling.
- Composer stays above both the bottom navigation and software keyboard.
- Preserve scroll position and avoid jumping when new content streams/renders.
- Large send/stop controls with clear state.

Desktop:

- Constrain line length and retain a spacious centered chat layout.

### Groups

Keep group creation, membership, status, switching, and management.

Phone:

- Stack group cards.
- Show group name, role/status, and primary action first.
- Keep creation primary.
- Put delete/administrative actions in an explicit menu.
- Never hide management behind hover.

### Group Detail

Keep summary, members, activity, invitations, and permission-aware management.

Phone:

- Use Summary, Members, and Activity sections instead of side-by-side panels.
- Keep Invite or Manage visible only when authorized.
- Ensure member actions use adequate targets and explicit labels.

### Invitations

Keep invitation details, accept, decline, and status handling.

Phone:

- Stack cards.
- Show group, inviter, and expiry/status before secondary metadata.
- Accept and Decline become full-width or evenly divided 44px actions.
- Prevent duplicate response submissions.

### Challenges

Keep current, available, progress, join, and history behavior.

Phone:

- Use a Current/Available selector.
- Compact progress cards.
- Make Join or Continue the dominant card action.
- Expand secondary rules/rewards without removing them.

### Profile

Keep identity, avatar, preferences, validation, and editable fields.

Phone:

- One-column form.
- Persistent labels.
- Correct keyboard/autofill attributes.
- Safe sticky Save action for long content.
- Preserve unsaved input on errors.

### Settings

Keep all preferences, theme controls, account controls, and destructive operations.

Phone:

- Group related settings into clear sections.
- Use full-row settings controls where appropriate.
- Separate destructive account actions visually and require confirmation.
- Avoid wrapping several icon-only controls into one dense row.

### Auth

Keep authentication methods, branding, validation, and error behavior.

Phone:

- Centered safe-height card.
- 16px form inputs.
- Correct email/password autofill and password-manager support.
- 44px submit and secondary actions.
- Increase the existing small sign-up text target.
- Maintain usability with the keyboard open and in landscape.

### Invite acceptance

Keep token validation, group information, authentication requirements, and acceptance outcomes.

Phone:

- Focused card.
- Group and inviter first.
- One dominant Accept action.
- Explicit loading, expired, invalid, already-used, and success states.

## Delivery phases

### Phase 1 — Foundation and core workflows

Implement and verify:

- global safe-area and viewport contract,
- unified responsive-shell hook,
- centralized navigation model,
- phone bottom navigation,
- Quick Add sheet,
- More sheet,
- compact phone header,
- tablet rail behavior,
- adaptive overlay/form primitives,
- responsive toasts,
- Dashboard,
- Pantry,
- Shopping,
- Purchases,
- Consumption,
- Recipes,
- Recipe Detail.

Phase 1 must leave every later route reachable and at least safe within the new shell, even before its phase-specific refinement.

### Phase 2 — Data-heavy and intelligence workflows

Implement and verify:

- responsive chart and table patterns,
- Analytics,
- Pantry Intelligence,
- Food Intelligence,
- Nutrition,
- Coach.

### Phase 3 — Collaboration, account, and final polish

Implement and verify:

- Groups,
- Group Detail,
- Invitations,
- Challenges,
- Profile,
- Settings,
- Auth,
- Invite acceptance,
- complete dark-mode review,
- increased-text review,
- accessibility review,
- performance and layout-shift review,
- full viewport/device regression suite.

Prefer one reviewable commit per phase if committing is explicitly requested. Do not mix unrelated cleanup into these commits.

## Testing plan

### Automated checks

Use the existing tools:

```bash
npm test
npm run build
npx playwright test
```

Because the repository-wide lint baseline already fails, also run ESLint against every changed TypeScript/TSX file and introduce no new violations.

Add tests for:

- shell mode at width and short-landscape height boundaries,
- bottom navigation active-state mapping,
- More route coverage,
- Quick Add action wiring,
- purchase query-parameter list/detail behavior,
- invalid purchase selection,
- adaptive dialog state preservation,
- focus restoration,
- safe close behavior,
- table/card data equivalence,
- Nutrition section selection,
- reduced-motion classes/behavior where practical.

Add authenticated Playwright coverage using deterministic test data or the project’s supported fixture. Do not use or modify production user data.

### Viewport matrix

At minimum:

| Viewport | Purpose |
| --- | --- |
| 375×667 | Short/small phone |
| 390×844 | Standard modern iPhone |
| 430×932 | Large iPhone |
| 844×390 | Standard phone landscape |
| 932×430 | Large phone landscape |
| 768×1024 | Tablet portrait |
| 1024×768 | Tablet landscape/small desktop boundary |
| 1440×900 | Wide desktop |

Exercise both light and dark modes at representative phone and desktop sizes.

### Core end-to-end scenarios

- Authenticate and reach the protected shell.
- Navigate through all bottom tabs.
- Reach every non-primary route through More.
- Open each Quick Add action and complete/cancel safely.
- Add and edit a pantry item.
- Change pantry location/month/category filters.
- Add, check, edit, and delete a shopping item.
- Create a purchase through bulk paste, scan workflow, and manual entry.
- Open a purchase detail and return with browser Back.
- Log and delete consumption.
- Search/filter recipes.
- Import or create a recipe.
- Use mobile cooking mode.
- Switch Analytics/Nutrition sections.
- Use Coach while opening and closing the phone keyboard.
- Switch groups and inspect group detail.
- Accept/decline an invitation using fixture data.
- Update Profile and Settings.

### Physical iPhone checklist

Test in Safari and installed-PWA mode:

- notch/Dynamic Island does not obscure headers,
- home indicator does not obscure bottom navigation or actions,
- left/right landscape safe areas work,
- browser top/bottom chrome can expand and collapse,
- rotation does not lose dialog or form state,
- keyboard does not cover the active field or submit action,
- input types show the expected keyboard,
- autofill/password managers work,
- 200% browser text scaling remains usable,
- VoiceOver announces labels, selected tabs, expanded states, errors, and loading states,
- reduced-motion setting is respected,
- light/dark appearance has sufficient contrast,
- slow or interrupted requests give stable feedback and safe retry,
- no accidental page-level horizontal scrolling occurs.

## Performance requirements

- Preserve React Query caching and avoid duplicate requests introduced by responsive components.
- Do not render separate desktop and mobile copies of expensive route content simultaneously.
- Lazy-load heavy route/chart/dialog code where useful.
- Deduplicate font loading.
- Use stable image aspect ratios, dimensions, and lazy loading below the fold.
- Avoid large layout shifts between skeleton and loaded content.
- Avoid continuous resize listeners; use media queries and `matchMedia`.
- Debounce search/filter requests where the current behavior would otherwise issue requests per keystroke.
- Keep animations short, composited, and non-blocking.
- Do not add a large dependency for behavior already covered by the existing stack.

## Acceptance criteria

The implementation is complete when:

- Every existing route and important action remains available on phone, tablet, and desktop.
- The phone experience uses the bottom navigation and Quick Add behavior defined here.
- Desktop retains its efficient sidebar, toolbar, and multi-column layouts.
- Tablet uses the compact rail rather than prematurely showing the phone drawer or full desktop sidebar.
- No required action depends on hover.
- Normal phone controls expose approximately 44×44px hit areas.
- No fixed control, toast, dialog, or composer overlaps the notch, Dynamic Island, home indicator, browser chrome, or keyboard.
- There is no unintended page-level horizontal scrolling at any test viewport.
- Wide data remains complete through responsive cards, expansion, or intentional contained scrolling.
- Forms remain usable with autofill, the phone keyboard, validation errors, and increased text.
- Light mode, dark mode, portrait, landscape, reduced motion, keyboard navigation, and screen-reader labeling work.
- Automated tests and production build pass.
- Changed files have no new lint violations.
- Supabase functions, authentication behavior, security controls, database schema, and unrelated desktop functionality are unchanged.

## Expected implementation report

When handing the work back, report:

1. Completed phase(s).
2. Major components and routes changed.
3. Any intentional deviations from this brief and why.
4. Test commands and exact results.
5. Viewports manually or automatically verified.
6. Screenshots or recordings for representative phone, tablet, and desktop states.
7. Remaining risks or follow-up work.
8. Confirmation that no backend/security changes were made.

