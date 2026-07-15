-- Custom product variants: beyond the built-in color/size, admins can define
-- any number of extra variant groups (e.g. "Matériau" / "مادة") each with its
-- own set of values. Stored as jsonb so the shape stays flexible without a
-- join table; order_items gets its own snapshot column for the same reason
-- name_fr/name_ar/color/size are already snapshotted there — so an order stays
-- readable even if the product's variants are edited or removed later.
-- Paste this whole file into the Supabase SQL Editor and run it once.

alter table products
  add column if not exists variants jsonb not null default '[]'::jsonb;

alter table order_items
  add column if not exists variants jsonb not null default '[]'::jsonb;

-- place_order v4: same signature and rules as the 0007 hardening pass, plus
-- validating and snapshotting the custom variant selections.
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
    upper(substr(md5(random()::text), 1, 5));

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

-- Guest order lookup: now also returns each line's custom variant selections.
create or replace function get_order_by_number(p_order_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_items jsonb;
begin
  select * into v_order from orders where order_number = p_order_number;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'name_fr', oi.name_fr,
    'name_ar', oi.name_ar,
    'price', oi.price,
    'quantity', oi.quantity,
    'color', oi.color,
    'size', oi.size,
    'variants', oi.variants,
    'image_url', oi.image_url
  )), '[]'::jsonb) into v_items
  from order_items oi
  where oi.order_id = v_order.id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'customer_name', v_order.customer_name,
    'wilaya', v_order.wilaya,
    'city', v_order.city,
    'delivery_type', v_order.delivery_type,
    'subtotal', v_order.subtotal,
    'shipping', v_order.shipping,
    'discount', v_order.discount,
    'total', v_order.total,
    'status', v_order.status,
    'created_at', v_order.created_at,
    'items', v_items
  );
end;
$$;

grant execute on function get_order_by_number(text) to anon;
