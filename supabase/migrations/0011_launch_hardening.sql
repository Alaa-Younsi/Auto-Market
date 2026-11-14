-- ============================================================================
-- 0011 — launch hardening (2026-11-14)
-- Paste this whole file into Supabase → SQL Editor and run it once.
-- Safe to re-run: every statement is idempotent.
--
--  1. 69 wilayas. Loi 26-06 (4 April 2026) promoted eleven districts to
--     wilayas 59–69. The live table only had the old 58, so a customer in
--     Bou Saâda, Aflou, Barika… could not check out at all. Each new wilaya
--     inherits the CURRENT price/active flag of the wilaya it was split from.
--  2. Storage: drop the anon SELECT policies on storage.objects. A public
--     bucket serves files by URL without any policy; the SELECT policy only
--     added the *list* API, which let anyone enumerate every upload
--     (including photos of draft products). Staff keep SELECT (remove and
--     replace need it).
--  3. place_order v5 — same signature, plus:
--       - order numbers get 10 hex chars (was 5 ≈ 1M values, guessable by
--         brute force through get_order_by_number);
--       - a global circuit breaker: >30 orders in the last minute is a bot
--         rotating fake phone numbers, not real traffic;
--       - ERR_MISSING_SELECTION: a product that defines colours / sizes /
--         option groups must have each one chosen (the storefront already
--         gates this; a direct RPC call skipped it).
--  4. Stock follows the order status both ways: into 'cancelled' credits the
--     stock back, OUT of 'cancelled' (an admin re-opening it) takes it again
--     and refuses if there is no longer enough. Lines of the same product
--     are summed — the old UPDATE … FROM credited only one of them.
-- ============================================================================

------------------------------------------------------------------------------
-- 1. Wilayas 59–69
------------------------------------------------------------------------------
insert into delivery_prices (wilaya, home_price, office_price, active)
select
  nw.name,
  coalesce(parent.home_price, 600),
  coalesce(parent.office_price, 400),
  coalesce(parent.active, true)
from (values
  (59, 'Aflou',                 'Laghouat'),
  (60, 'Barika',                'Batna'),
  (61, 'El Kantara',            'Biskra'),
  (62, 'Bir El Ater',           'Tébessa'),
  (63, 'El Aricha',             'Tlemcen'),
  (64, 'Ksar Chellala',         'Tiaret'),
  (65, 'Aïn Oussera',           'Djelfa'),
  (66, 'Messaad',               'Djelfa'),
  (67, 'Ksar El Boukhari',      'Médéa'),
  (68, 'Bou Saâda',             'M''Sila'),
  (69, 'El Abiodh Sidi Cheikh', 'El Bayadh')
) as nw(code, name, split_from)
left join delivery_prices parent on parent.wilaya = nw.split_from
on conflict (wilaya) do nothing;

------------------------------------------------------------------------------
-- 2. Storage: no public listing
------------------------------------------------------------------------------
drop policy if exists "product_images_bucket_public_read" on storage.objects;
drop policy if exists "product_videos_bucket_public_read" on storage.objects;

drop policy if exists "media_buckets_authenticated_select" on storage.objects;
create policy "media_buckets_authenticated_select"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('product-images', 'product-videos'));

------------------------------------------------------------------------------
-- 3. place_order v5
------------------------------------------------------------------------------
create index if not exists orders_created_at_idx on orders (created_at desc);

-- place_order v5 (see header). Everything not listed there is unchanged from v4.
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
    if v_product.stock < v_qty then
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

    v_base := v_product.price * v_qty;
    v_line_best := v_base;

    for v_offer in select * from jsonb_array_elements(coalesce(v_product.quantity_offers, '[]'::jsonb))
    loop
      v_candidate := null;

      if v_offer->>'type' = 'free' then
        v_buy := (v_offer->>'buy')::int;
        v_get := (v_offer->>'get')::int;
        if coalesce(v_buy, 0) > 0 and coalesce(v_get, 0) > 0 then
          -- Every full group of (buy + get) units contains `get` free units.
          v_candidate := (v_qty - (v_qty / (v_buy + v_get)) * v_get) * v_product.price;
        end if;
      elsif v_offer->>'type' = 'price' then
        v_bundle_qty := (v_offer->>'qty')::int;
        v_bundle_price := (v_offer->>'price')::numeric;
        if coalesce(v_bundle_qty, 0) > 1 and coalesce(v_bundle_price, -1) >= 0
           and v_qty >= v_bundle_qty then
          v_candidate := (v_qty / v_bundle_qty) * v_bundle_price
                       + (v_qty % v_bundle_qty) * v_product.price;
        end if;
      end if;

      if v_candidate is not null and v_candidate < v_line_best then
        v_line_best := v_candidate;
      end if;
    end loop;

    v_subtotal := v_subtotal + v_base;
    v_discount := v_discount + (v_base - v_line_best);
  end loop;

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

------------------------------------------------------------------------------
-- 4. Stock follows the status both ways
------------------------------------------------------------------------------
create or replace function restock_cancelled_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short text;
begin
  -- Into 'cancelled': give the units back (lines of one product summed).
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update products p
    set stock = p.stock + l.qty
    from (
      select product_id, sum(quantity)::int as qty
      from order_items
      where order_id = new.id and product_id is not null
      group by product_id
    ) l
    where p.id = l.product_id;

  -- Out of 'cancelled' (re-opened by an admin): reserve them again, or refuse
  -- the status change if the stock has since been sold to someone else.
  elsif old.status = 'cancelled' and new.status is distinct from 'cancelled' then
    select p.name_fr into v_short
    from products p
    join (
      select product_id, sum(quantity)::int as qty
      from order_items
      where order_id = new.id and product_id is not null
      group by product_id
    ) l on l.product_id = p.id
    where p.stock < l.qty
    limit 1;

    if v_short is not null then
      raise exception 'ERR_STOCK: insufficient stock for %', v_short;
    end if;

    update products p
    set stock = p.stock - l.qty
    from (
      select product_id, sum(quantity)::int as qty
      from order_items
      where order_id = new.id and product_id is not null
      group by product_id
    ) l
    where p.id = l.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_restock_on_cancel on orders;
create trigger orders_restock_on_cancel
  after update of status on orders
  for each row
  execute function restock_cancelled_order();
