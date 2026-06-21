# VoiceTurk UI/UX System

## Design Language

**Calm Premium Audio Workstation** — not a generic admin template.

| Principle | Implementation |
|---|---|
| Dark-first | `prefers-color-scheme: dark` default; light variant via `data-theme="light"` |
| Accent palette | Violet (`#8b7cff / #6554f0`) + Cyan (`#41d5e5 / #22a4b3`) |
| Body font | DM Sans (9–40px optical size axis) |
| Display font | Manrope (800w for headings and numerals) |
| Minimum radius | `--r-sm: 8px` up to `--r-pill: 999px` |
| Motion | All transitions 120–350ms ease; `prefers-reduced-motion` fully respected |
| Glassmorphism | `backdrop-filter: blur(16–20px)` on header, nav, and telemetry panel |

---

## CSS Custom Properties (Design Tokens)

All tokens are defined on `:root` (dark) and `:root[data-theme="light"]` (light):

```css
/* Surfaces */
--bg, --bg-2           background layers
--surface, --surface-2, --surface-3   card and panel surfaces

/* Text */
--text, --text-2, --muted

/* Lines */
--line, --line-2       border colors

/* Accents */
--accent, --accent-dark, --accent-2, --accent-2-dark

/* Semantic */
--success, --success-dim
--warning, --warning-dim
--danger,  --danger-dim
--info,    --info-dim

/* Glow */
--glow-accent, --glow-2

/* Spacing */
--space-1 through --space-16   (4px–64px t-shirt scale)

/* Radius */
--r-sm, --r-md, --r-lg, --r-xl, --r-pill

/* Shadows */
--shadow-sm, --shadow-md, --shadow-lg, --shadow-accent

/* Transitions */
--t-fast: 120ms ease
--t-mid:  200ms ease
--t-slow: 350ms ease
```

---

## Component Inventory

### Layout
- `.workspace` — max-width container (1260px, 94vw)
- `.section` — standard page section with 24px gap
- `.section-head` — flex header with title + actions
- `.grid-2`, `.grid-3`, `.grid-auto`, `.stack`, `.cluster`

### App Shell
- `.app-shell` — full-height flex column
- `.app-header` — sticky glassmorphism header (68px, z-index 50)
- `.brand-mark` — gradient 40×40 badge
- `.workflow-nav` — sticky tabs below header (z-index 40)
- `.nav-tab` — workflow step tab with numbered badge
- `.account-pill` — user identity pill

### Buttons
- `.btn` base + `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-success`
- `.btn-sm`, `.btn-lg`, `.btn-block`, `.btn-icon` sizing variants
- Legacy `button:not([class])` targets unstyled buttons

### Forms
- `label > input/select/textarea` with gap 6px
- `.form-error`, `.form-success` feedback strips
- `.form-group`, `.form-row` (2-column)
- `.emotion-pills` for multi-select chip groups
- `.tags` + `.tag` for display tags

### Status Chips
`.status` with semantic color classes:
- `accepted`, `active`, `ready`, `completed` → success green
- `review_pending`, `checking`, `wait_deepcheck` → warning yellow
- `pipeline_error`, `rejected`, `failed` → danger red
- `recording` → danger red pulsing animation
- `draft`, `need_retake` → info blue

### Cards
- `.card` — base card with gradient, border, shadow
- `.card.interactive` — hover lift + border glow
- `.card.selected` — accent border + glow ring
- `.glass` — glass panel variant

### Campaign Cards
- `.campaign-card`, `.campaign-card-header`, `.campaign-card-title`, `.campaign-card-footer`
- `.coverage-bar` + `.coverage-bar-fill` — animated width

### Recording Studio
- `.studio-layout` — 2-col: main (1.8fr) + sidebar (260px min)
- `.task-prompt` — gradient card for transcript display
- `.task-transcript` — large responsive font (clamp 1.4–2rem)
- `.coach-message` — accent-tinted panel with robot icon
- `.recorder-card` — mic ring + waveform + controls
- `.mic-ring` states: `idle`, `live` (pulse animation), `ready`
- `.waveform-bars` + `.waveform-bar` — 9-bar animated waveform
- `.volume-meter` + `.volume-fill` — dBFS level meter

### Telemetry Panel
- `.telemetry-panel` — sticky sidebar, scrollable, 4px scrollbar
- `.metrics-dl` — 2-col dt/dd grid
- `.pipeline-log` + `.log-entry` — timestamped event log
- `.quality-grid` + `.quality-cell` — metric grid

### Review Panel
- `.sample-card` — card for audio review
- `.ai-note` — DeepCheck message (italic, left-border accent)
- `.review-actions` — 3-button row (accept/retake/reject)

### Dataset Panel
- `.coverage-stats` — responsive stat box grid
- `.stat-box` + `.stat-value` + `.stat-label`
- `.dataset-files` + `.dataset-file` — monospace file list
- `.verify-result.match/.mismatch` — large result display

### Notifications
- `.toast-container` — fixed bottom-right, max 360px
- `.toast` — animated entry, 4s auto-dismiss

### Loading States
- `.skeleton` — shimmer animation (CSS gradient)
- `.skeleton-text`, `.skeleton-h2`, `.skeleton-card`

### Empty States
- `.empty-state` — centered grid with icon, title, description, CTA
- `.empty-icon` — large emoji/icon

---

## Responsive Breakpoints

| Breakpoint | Changes |
|---|---|
| `max-width: 1000px` | Studio sidebar stacks below main, telemetry un-sticks |
| `max-width: 768px` | Auth hero hidden, nav scrollable, form rows collapse, account info hidden |
| `max-width: 480px` | Single column grids, review buttons full-width |

---

## Accessibility

- All interactive elements have `focus-visible` outlines (2px solid `--accent`)
- Status chips use semantic ARIA roles in coach message (`aria-live="polite"`)
- Volume meter uses `role="meter"` with `aria-valuenow/min/max`
- Navigation uses `<nav>` landmark
- Main content uses `<main>` landmark
- Auth page uses `<section>` landmarks
- Empty states have descriptive titles

---

## File Locations

| File | Purpose |
|---|---|
| `apps/web/src/styles.css` | Complete design system (22 sections) |
| `apps/web/src/shared/ui/Toast.tsx` | Toast context + provider |
| `apps/web/src/shared/ui/components.tsx` | Status, skeletons, empty state, waveform, volume meter |
| `apps/web/src/features/auth/LoginPage.tsx` | Auth page with hero + card |
| `apps/web/src/features/campaigns/CampaignPage.tsx` | Campaign grid, coverage, role-aware actions |
| `apps/web/src/features/campaigns/CampaignCreateForm.tsx` | Campaign creation modal |
| `apps/web/src/features/recording/RecordingStudio.tsx` | Full pipeline recording UI |
| `apps/web/src/features/review/ReviewPage.tsx` | Sample review cards |
| `apps/web/src/features/dataset/DatasetPage.tsx` | Dataset build, coverage chart, verify |
| `apps/web/src/App.tsx` | Shell orchestrator |
