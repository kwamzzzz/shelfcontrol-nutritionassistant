# Shelf Control

**Control your shelf. Nourish your life.**

A personal and collaborative kitchen operating system — track what you buy, store, cook, consume, spend, waste, and need to restock.

---

## 🎨 Official Brand Color — READ BEFORE CHANGING ANY COLORS

> **The official brand color of Shelf Control is FRESH GREEN, on a white (light) / deep‑green‑black (dark) base.**
>
> This is intentional and canonical. **Do not** revert the UI to purple (the old "Lumina" theme) or to the olive/sage tones in `src/assets/brand/reference/` — those are superseded for the product UI. The green theme below is the source of truth.

**Single source of truth:** all theme tokens live in [`src/index.css`](src/index.css) as HSL custom properties (`:root` = light, `.dark` = dark). Edit colors there and nowhere else.

### Core palette

| Role | Token | Light | Dark |
|------|-------|-------|------|
| **Brand green (primary)** | `--primary` | `hsl(142 72% 34%)` ≈ `#159645` | `hsl(142 66% 45%)` ≈ `#27CD66` |
| Base background | `--background` | `hsl(0 0% 100%)` `#FFFFFF` | `hsl(155 30% 6%)` ≈ `#0B1712` |
| Main text | `--foreground` | `hsl(155 25% 12%)` ≈ `#173029` | `hsl(150 15% 96%)` ≈ `#F2F6F4` |
| Muted text | `--muted-foreground` | `hsl(155 12% 42%)` | `hsl(150 12% 62%)` |
| Border | `--border` | `hsl(150 18% 90%)` | `hsl(150 20% 100% / .08)` |
| Success / fresh | `--success` | `hsl(142 68% 36%)` | `hsl(142 60% 48%)` |
| Warning / expiring | `--warning` | `hsl(32 95% 48%)` (amber) | `hsl(32 95% 55%)` |
| Critical / expired | `--destructive` | `hsl(0 72% 48%)` (red) | `hsl(0 62% 46%)` |

### Accents & gradients

- **Brand gradient (`--gradient-cool`)** — green, used on primary buttons and hero cards: `linear-gradient(135deg, #059669 0%, #34D399 100%)`
- **Warm accent (`--gradient-warm`)** — amber/orange, a deliberate secondary pop for the logo tile and notification badges: `linear-gradient(135deg, #FDE68A → #FB923C → #F97316)`. Green is primary; warm is accent only.
- **Radius:** `--radius: 0.75rem`

### Theming

Light + dark modes are both first-class (default: light). The toggle lives in the sidebar footer and persists via `next-themes` (`.dark` class on `<html>`). Most UI uses semantic tokens (`bg-primary`, `text-foreground`, `bg-card`…), so changing a token in `src/index.css` re-themes the whole app.

---

## Development

```bash
bun install       # install dependencies
bun run dev       # start dev server (http://localhost:8080)
bun run build     # production build
bun run lint      # eslint
```

**Stack:** Vite • React 18 • TypeScript • Tailwind + shadcn/ui • TanStack Query • Supabase • `next-themes`. Font: Inter.

---

## Notes

- Backend (auth, database, storage, edge functions) is Supabase — see `supabase/`.
- This project syncs bidirectionally with [Lovable](https://lovable.dev) via the `main` branch.
