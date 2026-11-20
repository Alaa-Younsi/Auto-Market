-- ============================================================================
-- 0013 — admin suite + security hardening (2026-11-20)
-- Paste this whole file into Supabase → SQL Editor and run it once.
-- Safe to re-run: every statement is idempotent.
--
--  1. ADMIN ALLOWLIST. Until now every policy said `to authenticated using
--     (true)`: ANY Supabase Auth account had full write access to products,
--     orders and storage. Sign-up is disabled today, so only the owner has an
--     account — but one dashboard toggle would have handed the shop to anyone
--     holding the public anon key. Writes now require `is_admin()`, backed by
--     `admin_users`, which is seeded with the accounts that exist right now.
--     Orders: staff SELECT, UPDATE of `status` only (column privilege), and
--     DELETE. Nobody INSERTs — orders are created by place_order() alone.
--     Storage: uploads restricted to admins and to image/video MIME types (an
--     HTML/SVG file uploaded to a public bucket is a stored-XSS host).
--  2. Store settings: contact, social links and the legal identity law 18-05
--     requires the shop to publish (RC, NIF, NIS, AI) — edited in Réglages.
--  3. E-mail order notifications: per-admin preferences, `orders.notified_at`
--     and an at-most-once claim function used ONLY by the `notify` edge
--     function (service role). It is deliberately granted to NOBODY: a grant
--     to anon would leak the customer's phone and let a stranger burn the
--     real notification by probing order numbers.
--  4. Promotions engine. Resolution order — identical in src/lib/promotions.ts:
--       1. Packs consume cart quantities first, highest priority first.
--       2. Whatever quantity is LEFT on a line takes the single BEST of: the
--          product's own quantity offers, and every eligible promotion.
--       3. Discounts never stack on the same unit. Rounded once, at the end,
--          to 2 dp, and clamped to the subtotal.
--     apply_promotions() is the engine, price_cart() is what the cart shows,
--     place_order v6 charges through the same engine — quote = charge.
--  5. Product landing pages (/lp/:slug) — copy only; price, stock and offers
--     stay on the product and the order is still priced by place_order.
--  6. Legal pages + the "Politique" page: admin overrides of the text compiled
--     into the app (NULL = use the built-in text).
-- ============================================================================

------------------------------------------------------------------------------
-- 1. Admin allowlist
------------------------------------------------------------------------------
create table if not exists admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table admin_users enable row level security;

-- Every account that exists today is the store's own (public sign-up is off).
insert into admin_users (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;
revoke execute on function is_admin() from public;
revoke execute on function is_admin() from anon;
grant execute on function is_admin() to authenticated;

drop policy if exists "admin_users_self_select" on admin_users;
create policy "admin_users_self_select" on admin_users
  for select to authenticated using (user_id = auth.uid());
revoke all on admin_users from anon;
revoke insert, update, delete on admin_users from authenticated;
grant select on admin_users to authenticated;

-- Replace every "any signed-in user" policy with an admin-only one. The anon
-- read policies are separate (`to anon`) and untouched: anon has no EXECUTE on
-- is_admin(), so it must never appear in a policy anon evaluates.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'products', 'product_images', 'store_settings',
    'delivery_prices', 'client_reviews', 'tracking_pixels'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_authenticated_all', t);
    execute format('drop policy if exists %I on %I', t || '_admin_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (is_admin()) with check (is_admin())',
      t || '_admin_all', t
    );
  end loop;
end $$;

-- Orders: read, change the status, delete. Never insert, never edit amounts.
drop policy if exists "orders_authenticated_all" on orders;
drop policy if exists "orders_admin_select" on orders;
drop policy if exists "orders_admin_update" on orders;
drop policy if exists "orders_admin_delete" on orders;
create policy "orders_admin_select" on orders
  for select to authenticated using (is_admin());
create policy "orders_admin_update" on orders
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "orders_admin_delete" on orders
  for delete to authenticated using (is_admin());
revoke insert, update on orders from authenticated;
grant update (status) on orders to authenticated;
revoke all on orders from anon;

drop policy if exists "order_items_authenticated_all" on order_items;
drop policy if exists "order_items_admin_select" on order_items;
create policy "order_items_admin_select" on order_items
  for select to authenticated using (is_admin());
revoke insert, update, delete on order_items from authenticated;
revoke all on order_items from anon;

-- Storage: admin-only writes, typed buckets.
drop policy if exists "product_images_bucket_authenticated_write" on storage.objects;
drop policy if exists "product_images_bucket_authenticated_update" on storage.objects;
drop policy if exists "product_images_bucket_authenticated_delete" on storage.objects;
drop policy if exists "product_videos_bucket_authenticated_write" on storage.objects;
drop policy if exists "product_videos_bucket_authenticated_update" on storage.objects;
drop policy if exists "product_videos_bucket_authenticated_delete" on storage.objects;
drop policy if exists "media_buckets_authenticated_select" on storage.objects;
drop policy if exists "media_admin_select" on storage.objects;
drop policy if exists "media_admin_insert" on storage.objects;
drop policy if exists "media_admin_update" on storage.objects;
drop policy if exists "media_admin_delete" on storage.objects;

create policy "media_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id in ('product-images', 'product-videos') and is_admin());
create policy "media_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images', 'product-videos') and is_admin());
create policy "media_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images', 'product-videos') and is_admin());
create policy "media_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images', 'product-videos') and is_admin());

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    file_size_limit = 10485760
where id = 'product-images';
update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime'],
    file_size_limit = 52428800
where id = 'product-videos';

------------------------------------------------------------------------------
-- 2. Store settings: contact, social links, legal identity
------------------------------------------------------------------------------
alter table store_settings add column if not exists contact_phone    text;
alter table store_settings add column if not exists contact_whatsapp text;
alter table store_settings add column if not exists contact_email    text;
alter table store_settings add column if not exists address_fr       text;
alter table store_settings add column if not exists address_ar       text;
alter table store_settings add column if not exists hours_fr         text;
alter table store_settings add column if not exists hours_ar         text;
alter table store_settings add column if not exists social_instagram text;
alter table store_settings add column if not exists social_facebook  text;
alter table store_settings add column if not exists social_tiktok    text;
alter table store_settings add column if not exists social_youtube   text;
alter table store_settings add column if not exists social_snapchat  text;
alter table store_settings add column if not exists legal_name       text;
alter table store_settings add column if not exists legal_owner      text;
alter table store_settings add column if not exists legal_rc         text;
alter table store_settings add column if not exists legal_nif        text;
alter table store_settings add column if not exists legal_nis        text;
alter table store_settings add column if not exists legal_ai         text;

alter table store_settings drop constraint if exists store_settings_contact_check;
alter table store_settings add constraint store_settings_contact_check check (
  (contact_phone is null or contact_phone ~ '^\+?[0-9 ]{9,20}$')
  and (contact_whatsapp is null or contact_whatsapp ~ '^\+?[0-9 ]{9,20}$')
  and (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$')
  and (social_instagram is null or social_instagram ~ '^https://[^\s"<>]+$')
  and (social_facebook  is null or social_facebook  ~ '^https://[^\s"<>]+$')
  and (social_tiktok    is null or social_tiktok    ~ '^https://[^\s"<>]+$')
  and (social_youtube   is null or social_youtube   ~ '^https://[^\s"<>]+$')
  and (social_snapchat  is null or social_snapchat  ~ '^https://[^\s"<>]+$')
  and char_length(coalesce(address_fr, '')) <= 200
  and char_length(coalesce(address_ar, '')) <= 200
  and char_length(coalesce(hours_fr, '')) <= 120
  and char_length(coalesce(hours_ar, '')) <= 120
  and char_length(coalesce(legal_name, '')) <= 120
  and char_length(coalesce(legal_owner, '')) <= 120
  and char_length(coalesce(legal_rc, '')) <= 40
  and char_length(coalesce(legal_nif, '')) <= 40
  and char_length(coalesce(legal_nis, '')) <= 40
  and char_length(coalesce(legal_ai, '')) <= 40
);

-- Carry over what the footer showed until now, only where nothing is set yet.
update store_settings set
  contact_phone    = coalesce(contact_phone, '+213 555 91 73 33'),
  contact_whatsapp = coalesce(contact_whatsapp, '+213 555 91 73 33'),
  social_instagram = coalesce(social_instagram, 'https://www.instagram.com/automarket.shop_/'),
  social_tiktok    = coalesce(social_tiktok, 'https://www.tiktok.com/@automarket.shop_')
where id = 1;

------------------------------------------------------------------------------
-- 3. E-mail order notifications
------------------------------------------------------------------------------
alter table orders add column if not exists notified_at timestamptz;

create table if not exists admin_notification_prefs (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  email_enabled boolean not null default false,
  notify_email  text check (notify_email is null or notify_email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  updated_at    timestamptz not null default now(),
  constraint admin_notification_prefs_email_needed
    check (not email_enabled or notify_email is not null)
);
alter table admin_notification_prefs enable row level security;
drop policy if exists "notification_prefs_own" on admin_notification_prefs;
create policy "notification_prefs_own" on admin_notification_prefs
  for all to authenticated
  using (user_id = auth.uid() and is_admin())
  with check (user_id = auth.uid() and is_admin());
revoke all on admin_notification_prefs from anon;
grant select, insert, update, delete on admin_notification_prefs to authenticated;

drop trigger if exists admin_notification_prefs_updated_at on admin_notification_prefs;
create trigger admin_notification_prefs_updated_at
  before update on admin_notification_prefs
  for each row execute function update_updated_at();

create or replace function claim_order_notification(p_order_number text)
returns table (
  order_number text, customer_name text, customer_phone text, wilaya text,
  city text, delivery_type text, subtotal numeric, discount numeric,
  shipping numeric, total numeric, items jsonb, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update orders o set notified_at = now()
     where o.order_number = p_order_number
       and o.notified_at is null
       and o.created_at > now() - interval '1 hour'
    returning o.order_number, o.customer_name, o.customer_phone, o.wilaya,
              o.city, o.delivery_type, o.subtotal, o.discount, o.shipping, o.total,
              (select coalesce(jsonb_agg(jsonb_build_object(
                 'name', oi.name_fr, 'quantity', oi.quantity, 'price', oi.price,
                 'color', oi.color, 'size', oi.size, 'variants', oi.variants)), '[]'::jsonb)
                 from order_items oi where oi.order_id = o.id),
              o.created_at;
end;
$$;
-- Called only by the edge function's service-role client. No grants, ever.
revoke execute on function claim_order_notification(text) from public;
revoke execute on function claim_order_notification(text) from anon;
revoke execute on function claim_order_notification(text) from authenticated;

------------------------------------------------------------------------------
-- 4. Promotions
------------------------------------------------------------------------------
create table if not exists promotions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  type         text not null check (type in ('buy_x_get_y', 'buy_x_percent', 'category_percent', 'pack')),
  active       boolean not null default false,
  priority     integer not null default 0 check (priority between -1000 and 1000),
  starts_at    timestamptz,
  ends_at      timestamptz,
  scope        text not null default 'all' check (scope in ('all', 'categories', 'products')),
  category_ids uuid[] not null default '{}',
  product_ids  uuid[] not null default '{}',
  buy_qty      integer not null default 0 check (buy_qty between 0 and 20),
  get_qty      integer not null default 0 check (get_qty between 0 and 20),
  percent      numeric(5, 2) not null default 0 check (percent >= 0 and percent < 100),
  pack_items   jsonb not null default '[]' check (jsonb_typeof(pack_items) = 'array'),
  pack_price   numeric(12, 2) check (pack_price is null or pack_price >= 0),
  label_fr     text check (char_length(label_fr) <= 60),
  label_ar     text check (char_length(label_ar) <= 60),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint promotions_window check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint promotions_rule check (
    (type = 'buy_x_get_y' and buy_qty >= 1 and get_qty >= 1)
    or (type = 'buy_x_percent' and buy_qty >= 1 and percent > 0)
    or (type = 'category_percent' and percent > 0)
    or (type = 'pack' and pack_price is not null and jsonb_array_length(pack_items) between 1 and 6)
  )
);
alter table promotions enable row level security;

drop trigger if exists promotions_updated_at on promotions;
create trigger promotions_updated_at
  before update on promotions
  for each row execute function update_updated_at();

-- The storefront reads LIVE promotions only (labels + the instant mirror). A
-- campaign scheduled for next week is not readable before it starts.
drop policy if exists "promotions_anon_select_live" on promotions;
create policy "promotions_anon_select_live" on promotions
  for select to anon
  using (active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
drop policy if exists "promotions_admin_all" on promotions;
create policy "promotions_admin_all" on promotions
  for all to authenticated using (is_admin()) with check (is_admin());
grant select on promotions to anon;
grant select, insert, update, delete on promotions to authenticated;

-- THE engine. Input lines are already price-resolved:
--   [{product_id, category_id, unit_price, quantity, quantity_offers}]
-- Output: {subtotal, discount, lines: [{gross, discount, net}]}
create or replace function apply_promotions(lines jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n int := coalesce(jsonb_array_length(lines), 0);
  v_unit numeric[] := '{}';
  v_qty int[] := '{}';
  v_rem int[] := '{}';
  v_pid uuid[] := '{}';
  v_cat uuid[] := '{}';
  v_disc numeric[] := '{}';
  v_cons numeric[];
  v_line jsonb;
  v_promo promotions%rowtype;
  v_offer jsonb;
  v_need record;
  v_times int;
  v_avail int;
  v_left int;
  v_take int;
  v_pack_gross numeric;
  v_pack_disc numeric;
  v_subtotal numeric := 0;
  v_total_disc numeric := 0;
  v_base numeric;
  v_best numeric;
  v_cand numeric;
  v_q int;
  v_eligible boolean;
  v_out jsonb := '[]'::jsonb;
  v_gross numeric;
  v_ld numeric;
  i int;
begin
  for i in 1..n loop
    v_line := lines -> (i - 1);
    v_unit := v_unit || (v_line->>'unit_price')::numeric;
    v_qty  := v_qty  || (v_line->>'quantity')::int;
    v_rem  := v_rem  || (v_line->>'quantity')::int;
    v_pid  := v_pid  || (v_line->>'product_id')::uuid;
    v_cat  := v_cat  || nullif(v_line->>'category_id', '')::uuid;
    v_disc := v_disc || 0::numeric;
    v_subtotal := v_subtotal + (v_line->>'unit_price')::numeric * (v_line->>'quantity')::int;
  end loop;

  -- 1. Packs consume quantities first, highest priority first.
  for v_promo in
    select * from promotions p
    where p.type = 'pack' and p.active
      and (p.starts_at is null or p.starts_at <= now())
      and (p.ends_at is null or p.ends_at > now())
      and p.pack_price is not null and p.pack_price >= 0
    order by p.priority desc, p.created_at, p.id
  loop
    v_times := null;
    for v_need in
      select (it->>'product_id')::uuid as pid, sum((it->>'quantity')::int)::int as q
      from jsonb_array_elements(v_promo.pack_items) it
      where coalesce((it->>'quantity')::int, 0) > 0
      group by 1
    loop
      v_avail := 0;
      for i in 1..n loop
        if v_pid[i] = v_need.pid then v_avail := v_avail + v_rem[i]; end if;
      end loop;
      v_times := least(coalesce(v_times, v_avail / v_need.q), v_avail / v_need.q);
    end loop;
    continue when v_times is null or v_times <= 0;

    v_cons := array_fill(0::numeric, array[greatest(n, 1)]);
    for v_need in
      select (it->>'product_id')::uuid as pid, sum((it->>'quantity')::int)::int as q
      from jsonb_array_elements(v_promo.pack_items) it
      where coalesce((it->>'quantity')::int, 0) > 0
      group by 1
    loop
      v_left := v_need.q * v_times;
      for i in 1..n loop
        exit when v_left <= 0;
        if v_pid[i] = v_need.pid then
          v_take := least(v_rem[i], v_left);
          v_rem[i] := v_rem[i] - v_take;
          v_left := v_left - v_take;
          v_cons[i] := v_cons[i] + v_take * v_unit[i];
        end if;
      end loop;
    end loop;

    v_pack_gross := 0;
    for i in 1..n loop v_pack_gross := v_pack_gross + v_cons[i]; end loop;
    v_pack_disc := greatest(0, v_pack_gross - v_promo.pack_price * v_times);
    if v_pack_gross > 0 and v_pack_disc > 0 then
      for i in 1..n loop
        v_disc[i] := v_disc[i] + v_pack_disc * v_cons[i] / v_pack_gross;
      end loop;
    end if;
  end loop;

  -- 2. The rest of each line takes its single best rule.
  for i in 1..n loop
    v_q := v_rem[i];
    continue when v_q <= 0;
    v_base := v_unit[i] * v_q;
    v_best := v_base;

    for v_offer in
      select * from jsonb_array_elements(coalesce(lines -> (i - 1) -> 'quantity_offers', '[]'::jsonb))
    loop
      v_cand := null;
      if v_offer->>'type' = 'free'
         and coalesce((v_offer->>'buy')::int, 0) > 0 and coalesce((v_offer->>'get')::int, 0) > 0 then
        v_cand := (v_q - (v_q / ((v_offer->>'buy')::int + (v_offer->>'get')::int)) * (v_offer->>'get')::int) * v_unit[i];
      elsif v_offer->>'type' = 'price'
         and coalesce((v_offer->>'qty')::int, 0) > 1 and coalesce((v_offer->>'price')::numeric, -1) >= 0
         and v_q >= (v_offer->>'qty')::int then
        v_cand := (v_q / (v_offer->>'qty')::int) * (v_offer->>'price')::numeric
                + (v_q % (v_offer->>'qty')::int) * v_unit[i];
      end if;
      if v_cand is not null and v_cand < v_best then v_best := v_cand; end if;
    end loop;

    for v_promo in
      select * from promotions p
      where p.type <> 'pack' and p.active
        and (p.starts_at is null or p.starts_at <= now())
        and (p.ends_at is null or p.ends_at > now())
      order by p.priority desc, p.created_at, p.id
    loop
      v_eligible := case v_promo.scope
        when 'all' then true
        when 'products' then v_pid[i] = any (v_promo.product_ids)
        else v_cat[i] is not null and v_cat[i] = any (v_promo.category_ids)
      end;
      continue when not v_eligible;

      v_cand := null;
      if v_promo.type = 'buy_x_get_y' and v_promo.buy_qty > 0 and v_promo.get_qty > 0 then
        v_cand := (v_q - (v_q / (v_promo.buy_qty + v_promo.get_qty)) * v_promo.get_qty) * v_unit[i];
      elsif v_promo.type = 'buy_x_percent' and v_promo.buy_qty > 0 and v_q >= v_promo.buy_qty
         and v_promo.percent > 0 and v_promo.percent < 100 then
        v_cand := v_base * (100 - v_promo.percent) / 100;
      elsif v_promo.type = 'category_percent' and v_promo.percent > 0 and v_promo.percent < 100 then
        v_cand := v_base * (100 - v_promo.percent) / 100;
      end if;
      if v_cand is not null and v_cand < v_best then v_best := v_cand; end if;
    end loop;

    v_disc[i] := v_disc[i] + (v_base - v_best);
  end loop;

  -- 3. Round once, clamp.
  for i in 1..n loop
    v_total_disc := v_total_disc + v_disc[i];
    v_gross := round(v_unit[i] * v_qty[i], 2);
    v_ld := least(round(v_disc[i], 2), v_gross);
    v_out := v_out || jsonb_build_object('gross', v_gross, 'discount', v_ld, 'net', v_gross - v_ld);
  end loop;

  return jsonb_build_object(
    'subtotal', round(v_subtotal, 2),
    'discount', least(round(v_total_disc, 2), round(v_subtotal, 2)),
    'lines', v_out
  );
end;
$$;
revoke execute on function apply_promotions(jsonb) from public;
revoke execute on function apply_promotions(jsonb) from anon;
revoke execute on function apply_promotions(jsonb) from authenticated;

-- What the cart and checkout DISPLAY. Prices and categories are read here from
-- the product ids; the client sends ids and quantities only. Read-only.
create or replace function price_cart(items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lines jsonb := '[]'::jsonb;
  v_item jsonb;
  v_product products%rowtype;
  v_qty int;
begin
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 20 then
    raise exception 'ERR_INVALID_INPUT: items';
  end if;
  for v_item in select * from jsonb_array_elements(items)
  loop
    v_qty := least(greatest(coalesce((v_item->>'quantity')::int, 0), 0), 20);
    continue when v_qty = 0;
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and status = 'active';
    continue when not found;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'category_id', v_product.category_id,
      'unit_price', v_product.price,
      'quantity', v_qty,
      'quantity_offers', coalesce(v_product.quantity_offers, '[]'::jsonb)
    );
  end loop;
  return apply_promotions(v_lines);
end;
$$;
revoke execute on function price_cart(jsonb) from public;
grant execute on function price_cart(jsonb) to anon, authenticated;

------------------------------------------------------------------------------
-- 5. Product landing pages
------------------------------------------------------------------------------
create table if not exists product_landings (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  product_id       uuid not null references products (id) on delete cascade,
  status           text not null default 'draft' check (status in ('draft', 'published')),
  headline_fr      text check (char_length(headline_fr) <= 120),
  headline_ar      text check (char_length(headline_ar) <= 120),
  sub_fr           text check (char_length(sub_fr) <= 300),
  sub_ar           text check (char_length(sub_ar) <= 300),
  cta_fr           text check (char_length(cta_fr) <= 40),
  cta_ar           text check (char_length(cta_ar) <= 40),
  urgency_fr       text check (char_length(urgency_fr) <= 120),
  urgency_ar       text check (char_length(urgency_ar) <= 120),
  story_title_fr   text check (char_length(story_title_fr) <= 120),
  story_title_ar   text check (char_length(story_title_ar) <= 120),
  story_fr         text check (char_length(story_fr) <= 2000),
  story_ar         text check (char_length(story_ar) <= 2000),
  hero_image_url   text check (hero_image_url ~ '^(https://|/)[^\s"<>]*$'),
  story_image_url  text check (story_image_url ~ '^(https://|/)[^\s"<>]*$'),
  benefits         jsonb not null default '[]' check (jsonb_typeof(benefits) = 'array' and jsonb_array_length(benefits) <= 8),
  faq              jsonb not null default '[]' check (jsonb_typeof(faq) = 'array' and jsonb_array_length(faq) <= 12),
  sections         jsonb not null default '[]' check (jsonb_typeof(sections) = 'array'),
  countdown_hours  integer check (countdown_hours is null or countdown_hours between 1 and 168),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists product_landings_product_idx on product_landings (product_id);
alter table product_landings enable row level security;

drop trigger if exists product_landings_updated_at on product_landings;
create trigger product_landings_updated_at
  before update on product_landings
  for each row execute function update_updated_at();

drop policy if exists "product_landings_anon_select_published" on product_landings;
create policy "product_landings_anon_select_published" on product_landings
  for select to anon using (status = 'published');
drop policy if exists "product_landings_admin_all" on product_landings;
create policy "product_landings_admin_all" on product_landings
  for all to authenticated using (is_admin()) with check (is_admin());
grant select on product_landings to anon;
grant select, insert, update, delete on product_landings to authenticated;

------------------------------------------------------------------------------
-- 6. Legal pages + Politique: overrides of the compiled text
------------------------------------------------------------------------------
create table if not exists legal_pages (
  page              text primary key check (page in ('policy', 'mentions', 'cgv', 'privacy', 'cookies')),
  title_fr          text check (char_length(title_fr) <= 120),
  title_ar          text check (char_length(title_ar) <= 120),
  intro_fr          text check (char_length(intro_fr) <= 1500),
  intro_ar          text check (char_length(intro_ar) <= 1500),
  updated_label_fr  text check (char_length(updated_label_fr) <= 80),
  updated_label_ar  text check (char_length(updated_label_ar) <= 80),
  updated_at        timestamptz not null default now()
);

-- builtin_key = a section the app ships text for (NULL = one the owner added,
-- which has no fallback and must carry its own French title + body).
create table if not exists legal_sections (
  id           uuid primary key default gen_random_uuid(),
  page         text not null check (page in ('policy', 'mentions', 'cgv', 'privacy', 'cookies')),
  builtin_key  text unique check (builtin_key ~ '^[a-z0-9_]{2,40}$'),
  sort_order   integer not null default 0,
  active       boolean not null default true,
  title_fr     text check (char_length(title_fr) <= 120),
  title_ar     text check (char_length(title_ar) <= 120),
  body_fr      text check (char_length(body_fr) <= 6000),
  body_ar      text check (char_length(body_ar) <= 6000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint legal_sections_custom_needs_fr
    check (builtin_key is not null or (char_length(btrim(coalesce(title_fr, ''))) > 0
                                      and char_length(btrim(coalesce(body_fr, ''))) > 0))
);
create index if not exists legal_sections_page_idx on legal_sections (page, sort_order);

alter table legal_pages enable row level security;
alter table legal_sections enable row level security;

drop trigger if exists legal_pages_updated_at on legal_pages;
create trigger legal_pages_updated_at
  before update on legal_pages for each row execute function update_updated_at();
drop trigger if exists legal_sections_updated_at on legal_sections;
create trigger legal_sections_updated_at
  before update on legal_sections for each row execute function update_updated_at();

drop policy if exists "legal_pages_anon_select" on legal_pages;
create policy "legal_pages_anon_select" on legal_pages for select to anon using (true);
drop policy if exists "legal_pages_admin_all" on legal_pages;
create policy "legal_pages_admin_all" on legal_pages
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "legal_sections_anon_select" on legal_sections;
create policy "legal_sections_anon_select" on legal_sections for select to anon using (true);
drop policy if exists "legal_sections_admin_all" on legal_sections;
create policy "legal_sections_admin_all" on legal_sections
  for all to authenticated using (is_admin()) with check (is_admin());

grant select on legal_pages, legal_sections to anon;
grant select, insert, update, delete on legal_pages, legal_sections to authenticated;

------------------------------------------------------------------------------
-- 7. place_order v6 — prices through apply_promotions (generated below)
------------------------------------------------------------------------------
create or replace function place_order(items jsonb, customer jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_offer jsonb;
  v_product products%rowtype;
  v_qty int;
  v_base numeric(10, 2);
  v_line_best numeric(10, 2);
  v_candidate numeric(10, 2);
  v_buy int;
  v_get int;
  v_bundle_qty int;
  v_bundle_price numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_shipping numeric(10, 2);
  v_delivery_type text;
  v_wilaya text;
  v_name text;
  v_phone text;
  v_city text;
  v_recent int;
  v_delivery_row delivery_prices%rowtype;
  v_settings store_settings%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_variants jsonb;
  v_group jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_priced jsonb;
  v_line_qty int;
begin
  ------------------------------------------------------------------
  -- 1. Validate the customer. Mirrors the zod schema, but enforced.
  ------------------------------------------------------------------
  v_name  := btrim(coalesce(customer->>'customer_name', ''));
  v_phone := btrim(coalesce(customer->>'customer_phone', ''));
  v_city  := btrim(coalesce(customer->>'city', ''));
  v_wilaya := btrim(coalesce(customer->>'wilaya', ''));
  v_delivery_type := coalesce(customer->>'delivery_type', 'home');

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'ERR_INVALID_INPUT: name';
  end if;

  -- Algerian mobile: 0[5-7] + 8 digits.
  if v_phone !~ '^0[5-7][0-9]{8}$' then
    raise exception 'ERR_INVALID_INPUT: phone';
  end if;

  if char_length(v_city) < 1 or char_length(v_city) > 80 then
    raise exception 'ERR_INVALID_INPUT: city';
  end if;

  if v_delivery_type not in ('home', 'office') then
    raise exception 'ERR_INVALID_INPUT: delivery_type';
  end if;

  ------------------------------------------------------------------
  -- 2. Rate limit by phone. COD orders are keyed on a reachable
  --    number, so that is the identity worth throttling. Cancelled
  --    orders still count — otherwise the limit is trivially reset.
  ------------------------------------------------------------------
  select count(*) into v_recent
  from orders
  where customer_phone = v_phone
    and created_at > now() - interval '10 minutes';

  if v_recent >= 3 then
    raise exception 'ERR_RATE_LIMIT: too many orders from this number';
  end if;

  select count(*) into v_recent
  from orders
  where customer_phone = v_phone
    and created_at > now() - interval '24 hours';

  if v_recent >= 10 then
    raise exception 'ERR_RATE_LIMIT: daily limit reached for this number';
  end if;

  -- Global circuit breaker. The per-phone limit does nothing against a bot
  -- rotating fake numbers; a real store never takes 30 orders in a minute.
  -- One-minute window so a burst ages out on its own instead of locking the
  -- shop for an hour.
  select count(*) into v_recent
  from orders
  where created_at > now() - interval '1 minute';

  if v_recent >= 30 then
    raise exception 'ERR_RATE_LIMIT: store is busy, retry in a minute';
  end if;

  ------------------------------------------------------------------
  -- 3. Validate the cart shape before touching stock.
  ------------------------------------------------------------------
  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'ERR_CART_EMPTY: cart is empty';
  end if;

  if jsonb_array_length(items) > 20 then
    raise exception 'ERR_INVALID_INPUT: too many lines';
  end if;

  -- Pass 1: validate every item (quantity, existence, stock) before mutating
  -- anything, and price each line with the best applicable offer.
  for v_item in select * from jsonb_array_elements(items)
  loop
    v_qty := (v_item->>'quantity')::int;
    -- An upper bound as well as a lower one: a bot ordering 10 000 units
    -- would zero the catalogue's stock in a single call.
    if v_qty is null or v_qty <= 0 or v_qty > 20 then
      raise exception 'ERR_PRODUCT_UNAVAILABLE: invalid quantity';
    end if;

    if jsonb_array_length(coalesce(v_item->'variants', '[]'::jsonb)) > 10 then
      raise exception 'ERR_INVALID_INPUT: too many variants';
    end if;

    select * into v_product from products
      where id = (v_item->>'product_id')::uuid
      and status = 'active'
      for update;

    if not found then
      raise exception 'ERR_PRODUCT_UNAVAILABLE: product not found or inactive';
    end if;

    -- Free units ship too: the full quantity must be in stock.
    -- The same product on several lines (two colours) shares one stock.
    select coalesce(sum((it->>'quantity')::int), 0) into v_line_qty
    from jsonb_array_elements(items) it
    where (it->>'product_id')::uuid = v_product.id;
    if v_product.stock < v_line_qty then
      raise exception 'ERR_STOCK: insufficient stock for %', v_product.name_fr;
    end if;

    -- Every axis the product defines must be chosen. The storefront gates
    -- this too, but a direct RPC call skips the storefront.
    if jsonb_array_length(coalesce(v_product.colors, '[]'::jsonb)) > 0
       and coalesce(btrim(v_item->>'color'), '') = '' then
      raise exception 'ERR_MISSING_SELECTION: color';
    end if;

    if jsonb_array_length(coalesce(v_product.sizes, '[]'::jsonb)) > 0
       and coalesce(btrim(v_item->>'size'), '') = '' then
      raise exception 'ERR_MISSING_SELECTION: size';
    end if;

    for v_group in select * from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb))
    loop
      if jsonb_array_length(coalesce(v_group->'values', '[]'::jsonb)) > 0
         and not exists (
           select 1
           from jsonb_array_elements(coalesce(v_item->'variants', '[]'::jsonb)) pick
           where pick->>'name_fr' = v_group->>'name_fr'
             and coalesce(btrim(pick->>'value'), '') <> ''
         ) then
        raise exception 'ERR_MISSING_SELECTION: %', v_group->>'name_fr';
      end if;
    end loop;

    -- Priced below, by the same engine price_cart() quotes with.
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'category_id', v_product.category_id,
      'unit_price', v_product.price,
      'quantity', v_qty,
      'quantity_offers', coalesce(v_product.quantity_offers, '[]'::jsonb)
    );
  end loop;

  -- Packs, store promotions and quantity offers: one engine, one result.
  v_priced := apply_promotions(v_lines);
  v_subtotal := (v_priced->>'subtotal')::numeric;
  v_discount := (v_priced->>'discount')::numeric;

  ------------------------------------------------------------------
  -- 4. Shipping. Resolved from delivery_prices, never from the client.
  ------------------------------------------------------------------
  select * into v_delivery_row from delivery_prices where wilaya = v_wilaya;
  select * into v_settings from store_settings where id = 1;

  if v_delivery_row.wilaya is null then
    -- Previously this silently fell back to store_settings.shipping_fee, which
    -- let a client invent a wilaya and still get an order through.
    raise exception 'ERR_INVALID_INPUT: unknown wilaya';
  end if;

  if not v_delivery_row.active then
    raise exception 'ERR_WILAYA_DISABLED: delivery is not available for this wilaya';
  end if;

  v_shipping := case when v_delivery_type = 'office'
    then v_delivery_row.office_price
    else v_delivery_row.home_price
  end;

  -- Free shipping keys off what the customer actually pays for goods.
  if (v_subtotal - v_discount) >= v_settings.free_ship_threshold then
    v_shipping := 0;
  end if;

  v_order_number := 'AM-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into orders (
    order_number, customer_name, customer_phone, wilaya, city,
    subtotal, shipping, discount, total, status, language, delivery_type
  ) values (
    v_order_number,
    v_name,
    v_phone,
    v_wilaya,
    v_city,
    v_subtotal,
    v_shipping,
    v_discount,
    v_subtotal - v_discount + v_shipping,
    'pending',
    case when customer->>'language' = 'ar' then 'ar' else 'fr' end,
    v_delivery_type
  )
  returning id into v_order_id;

  -- Pass 2: snapshot line items and decrement stock (verified sufficient above).
  for v_item in select * from jsonb_array_elements(items)
  loop
    v_qty := (v_item->>'quantity')::int;

    select * into v_product from products where id = (v_item->>'product_id')::uuid;

    select coalesce(jsonb_agg(jsonb_build_object(
      'name_fr', left(elem->>'name_fr', 40),
      'name_ar', left(elem->>'name_ar', 40),
      'value', left(elem->>'value', 40)
    )), '[]'::jsonb)
    into v_variants
    from jsonb_array_elements(coalesce(v_item->'variants', '[]'::jsonb)) elem;

    insert into order_items (
      order_id, product_id, name_fr, name_ar, price, quantity, color, size, variants, image_url
    ) values (
      v_order_id,
      v_product.id,
      v_product.name_fr,
      v_product.name_ar,
      v_product.price,
      v_qty,
      left(v_item->>'color', 40),
      left(v_item->>'size', 40),
      v_variants,
      (select url from product_images where product_id = v_product.id order by sort_order limit 1)
    );

    update products set stock = stock - v_qty where id = v_product.id;
  end loop;

  return v_order_number;
end;
$$;

grant execute on function place_order(jsonb, jsonb) to anon;

notify pgrst, 'reload schema';
