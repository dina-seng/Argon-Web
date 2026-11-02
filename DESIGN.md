# Argon Admin System Design System (DESIGN.md)
*Dedicated visual specification for the Admin Operational Console (`/admin`)*

## 1. Design Direction & Aesthetic
- **Concept**: Pristine Neo-Enterprise Dual-Theme Canvas with Tangerine & Obsidian Accents (Dribbble 2048x1536 BizFlow Architecture).
- **Tone**: Ultra-clean, luminous, high-density, authoritative, and physically tactile.
- **Light Canvas**: Soft cool alabaster `#F1F3F7` to `#F6F8FB`.
- **Dark Canvas (Obsidian)**: Deep aerospace void `#0B0F17` with dark card container `#131926`.
- **Card Surfaces**:
  - Light: Pure floating white `#FFFFFF` with ultra-smooth 24px (`rounded-3xl`) radius, hairline border `border border-slate-200/60`, and diffuse elevation `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`.
  - Dark: Deep slate `#131926` floating cards with `border border-slate-800`, inner specular highlights, and crisp contrast.

## 2. Color Palette & Dual-Mode Tokens
- **Primary Brand**:
  - `Argon Tangerine`: `#FF5B22` / `#FF6B35` (Accent badges, velocity bars, active icons, interactive focus states)
  - `Tangerine Glow`: `rgba(255, 91, 34, 0.12)`
- **Supporting Accents**:
  - `Ink Slate`: `#0F172A` (Light mode headlines, jump buttons) / Pure `#FFFFFF` (Dark mode headlines)
  - `Emerald Positive`: `#10B981` (Gross revenue, live health badges, healthy node status)
  - `Amber Warning`: `#F59E0B` (Pending checkouts, quota alerts, draft events)
  - `Rose Disputed`: `#EF4444` (Refunds, cancellations, error alerts)
- **Neutral Scale**:
  - Light mode: `text-slate-900`, `text-slate-600`, `text-slate-400`, `border-slate-200/70`, `bg-slate-50`
  - Dark mode: `text-white`, `text-slate-300`, `text-slate-400`, `border-slate-800`, `bg-slate-900/60`

## 3. Core Component Primitives
- **Metric Bento Cards**:
  - Light: Pure white `#FFFFFF` surface with `rounded-3xl` corners, `p-6`, and `shadow-sm`.
  - Dark: `#131926` surface with `border border-slate-800`.
  - Top-Right Jump Action: `h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-[#FF5B22] hover:text-white transition-colors` with `↗` icon.
  - Large Typography: `text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display`.
- **7-Day Velocity Interactive Telemetry**:
  - Dynamically renders real orders and revenue across the past 7 days from `metrics.dailyVelocity`.
  - Scaled column heights with electric tangerine `#FF5B22` and smooth hover tooltips.
- **Floating Sidebar Navigation**:
  - Detached container with gentle margins (`m-4 p-5 rounded-3xl shadow-xl`).
  - Vivid orange badge logo (`Argon Admin`).
  - Grouped navigation headers (`Core Console`, `Governance`, `System`).
  - First-class Dark / Light mode toggle with persistent state in `localStorage` (`argon_admin_theme`).
  - Live administrator profile pill with role badge and sign-out action.

## 4. Real Telemetry Policy (Zero Fake Data)
- **Zero Mock Metrics**: All dashboard cards, graphs, and tables are strictly wired to real PostgreSQL / Redis queries.
- **Transparent Seed State**: When database has 0 transactions or 0 revenue, honest `$0.00` and clear empty states are displayed without synthetic filler.
- **Top Events & User Breakdown**: Real capacity utilization percentages computed dynamically from PostgreSQL event and user counts.

## 5. Animation & Micro-Motion
- `animate-fade-in`: Smooth entrance for newly mounted admin routes.
- `hover-lift`: Subtle elevation on cards (`hover:-translate-y-0.5 transition-all duration-200`).
- `spring-press`: Interactive tactile response on buttons (`active:scale-95`).
