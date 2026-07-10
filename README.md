# Auto Market

Cash-on-delivery e-commerce store for car parts & accessories in Algeria.
Bun + Vite + React + TypeScript storefront, FR/AR RTL i18n, Supabase backend
(products, orders, wilaya-based delivery, reviews), server-side pricing via a
Postgres RPC, and a matching admin dashboard.

## Stack

- Bun + Vite + React 19 + TypeScript (strict)
- Tailwind CSS (theming via CSS variables, `data-theme` attribute — blue/white/green)
- Zustand (cart), TanStack Query (data fetching)
- react-hook-form + zod (forms)
- Supabase (Postgres, Auth, Storage)
- Framer Motion (animations)

## Getting started

```bash
bun install
cp .env.example .env   # then fill in your Supabase project URL + anon key
bun run dev
```

## Supabase setup (do this before anything works)

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` from your project's API settings.
3. Run the SQL migrations in `supabase/migrations/` **in order** (0001 → 0004),
   via the SQL editor in the Supabase dashboard or the Supabase CLI.
   - `0001_init.sql` — schema + seed categories + seed all 58 wilayas' delivery prices
   - `0002_rls.sql` — row-level security policies
   - `0003_functions.sql` — `place_order` and `get_order_by_number` RPCs
     (all pricing/stock is validated server-side here — the frontend never
     sends a trusted price)
   - `0004_storage.sql` — creates the `product-images` public storage bucket
     (skip if you'd rather create it by hand in the dashboard)
4. Create your admin user in **Authentication → Users** (email/password).
   This is the only way into `/admin`.
5. **Disable public sign-up** in **Authentication → Settings**. The RLS
   policies grant any `authenticated` session full admin access (there's no
   separate admin-role table in this pattern) — if sign-up is left open,
   anyone with the anon key (which ships in the frontend bundle) can
   self-register into admin access. This is the single most important step
   before going live.
6. Add real products, delivery prices, and reviews through `/admin` — not
   raw SQL — so you're exercising the same CRUD forms customers' orders will
   depend on.

## Scripts

```bash
bun run dev         # start dev server
bun run typecheck   # tsc --noEmit
bun run lint        # eslint, zero warnings allowed
bun run build        # typecheck + sitemap generation + production build
bun run preview      # preview the production build
```

## Deploy (GitHub + Vercel)

1. Push this repo to GitHub (`.env` is git-ignored — only `.env.example` is
   committed, so no credentials ship in the repo).
2. In Vercel: **New Project → Import** the GitHub repo. Vercel auto-detects
   Bun (from `bun.lock`) and Vite; `vercel.json` in this repo pins the build
   command and adds the SPA rewrite React Router needs (without it, a
   hard refresh on `/shop`, `/product/:slug`, `/admin`, etc. 404s).
3. Add the env vars from `.env.example` in **Project Settings → Environment
   Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Redeploy after
   adding them if the first deploy ran before they were set.
4. Do the Supabase setup steps above (migrations, admin user, disable public
   sign-up) against the **same** Supabase project the deployed env vars point
   to, before sharing the live URL.
5. Everything in "Before running paid ads" below still applies — do it
   before the domain goes out in any ad or DM.

## Before running paid ads

- Set your real Meta Pixel ID in `index.html` (replace `YOUR_PIXEL_ID` in
  both the `<script>` init and the `<noscript>` fallback `<img>`).
- Place at least one real order end-to-end as an anonymous (not logged in)
  customer, through both the cart checkout and the product-page "buy now"
  flow, and confirm the order confirmation page shows the order recap.
- Update the production domain in `index.html` (`canonical`, `og:url`,
  `og:image`) and `scripts/generate-sitemap.mjs` (`DOMAIN` constant) —
  currently placeholder `https://automarket.dz`.
- Regenerate `public/og-image.png` if you change branding:
  `powershell -File scripts/gen-og-image.ps1`.

## Project structure

```
src/
  components/   layout (Header/Footer/CartDrawer), product, ui, effects
  hooks/        data-fetching hooks (React Query) + auth + misc
  i18n/         FR/AR translations + LanguageProvider (RTL)
  lib/          supabase client, formatting, order placement, pixel
  pages/        storefront pages + pages/admin (dashboard)
  store/        cart (Zustand, persisted)
  theme/        ThemeProvider (light/dark via data-theme)
  types/        database types
supabase/
  migrations/   sequential SQL migrations — never renumber a shipped one
scripts/
  generate-sitemap.mjs   run on prebuild, queries active products
  gen-og-image.ps1       one-off OG share image generator
```
