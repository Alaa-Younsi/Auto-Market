-- ============================================================================
-- 0012 — admin-managed tracking pixels (Meta + TikTok)
-- Paste into Supabase → SQL Editor and run once. Safe to re-run.
--
-- The owner runs several campaigns, so the shop runs several pixels, and which
-- ones fire depends on the page. Pixel ids and their targeting live here and
-- are edited from /admin/pixels — no redeploy, no snippet in index.html.
--
--   scope 'all'      → every storefront page
--   scope 'paths'    → pages whose path starts with one of match_values
--   scope 'products' → product pages whose slug is in match_values
--   (an EMPTY match_values on a scoped pixel means "every page of that kind")
--
-- events: per-pixel on/off toggles. The storefront never fires anything on
-- /admin, and the anon key can only read ACTIVE rows, so a paused campaign's
-- id is not even readable from the public site.
-- ============================================================================

create table if not exists tracking_pixels (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null default 'meta' check (provider in ('meta', 'tiktok')),
  label        text not null check (char_length(btrim(label)) between 1 and 80),
  pixel_id     text not null,
  active       boolean not null default true,
  scope        text not null default 'all' check (scope in ('all', 'paths', 'products')),
  match_values text[] not null default '{}',
  events       jsonb not null default
    '{"page_view":true,"view_content":true,"add_to_cart":true,"initiate_checkout":true,"purchase":true}',
  sort_order   integer not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- A pasted base-code snippet instead of an id is the classic mistake: it
  -- saves fine and silently tracks nothing. Refuse it at the database too.
  constraint tracking_pixels_id_format check (
    (provider = 'meta'   and pixel_id ~ '^[0-9]{10,20}$') or
    (provider = 'tiktok' and pixel_id ~ '^[A-Z0-9]{10,40}$')
  ),
  constraint tracking_pixels_unique unique (provider, pixel_id)
);

drop trigger if exists tracking_pixels_set_updated_at on tracking_pixels;
create trigger tracking_pixels_set_updated_at
  before update on tracking_pixels
  for each row
  execute function update_updated_at();

alter table tracking_pixels enable row level security;

drop policy if exists "tracking_pixels_anon_select_active" on tracking_pixels;
create policy "tracking_pixels_anon_select_active" on tracking_pixels
  for select to anon using (active = true);

-- Same admin model as every other table in this project (sign-up is disabled,
-- so `authenticated` = the shop's admin accounts).
drop policy if exists "tracking_pixels_authenticated_all" on tracking_pixels;
create policy "tracking_pixels_authenticated_all" on tracking_pixels
  for all to authenticated using (true) with check (true);

grant select on tracking_pixels to anon;
grant select, insert, update, delete on tracking_pixels to authenticated;
