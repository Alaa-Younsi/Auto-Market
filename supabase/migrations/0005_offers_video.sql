-- Quantity offers ("buy X get Y free", "N for a bundle price") + product video.
-- Paste this whole file into the Supabase SQL Editor and run it once.

alter table products add column if not exists video_url text;
alter table products add column if not exists quantity_offers jsonb not null default '[]';
alter table orders add column if not exists discount numeric(10, 2) not null default 0;

-- quantity_offers format, an array of offers, e.g.:
--   [{"type": "free", "buy": 2, "get": 1}]          -> customer orders 3, pays 2
--   [{"type": "price", "qty": 2, "price": 2000}]    -> any 2 units cost 2000 DA total
-- place_order picks whichever applicable offer is cheapest for the customer.

-- Storage bucket for product videos (public read, admin write)
insert into storage.buckets (id, name, public)
values ('product-videos', 'product-videos', true)
on conflict (id) do nothing;

create policy "product_videos_bucket_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'product-videos');

create policy "product_videos_bucket_authenticated_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-videos');

create policy "product_videos_bucket_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-videos');

create policy "product_videos_bucket_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-videos');

-- place_order v2: same signature, now applies quantity offers server-side.
-- The client never sends prices OR discounts — both are computed here.
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
  v_delivery_row delivery_prices%rowtype;
  v_settings store_settings%rowtype;
  v_order_id uuid;
  v_order_number text;
begin
  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'ERR_CART_EMPTY: cart is empty';
  end if;

  v_delivery_type := coalesce(customer->>'delivery_type', 'home');
  v_wilaya := customer->>'wilaya';

  -- Pass 1: validate every item (quantity, existence, stock) before mutating
  -- anything, and price each line with the best applicable offer.
  for v_item in select * from jsonb_array_elements(items)
  loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'ERR_PRODUCT_UNAVAILABLE: invalid quantity';
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

  -- Resolve shipping from delivery_prices, falling back to store_settings.
  select * into v_delivery_row from delivery_prices where wilaya = v_wilaya;
  select * into v_settings from store_settings where id = 1;

  if v_delivery_row.wilaya is not null then
    if not v_delivery_row.active then
      raise exception 'ERR_WILAYA_DISABLED: delivery is not available for this wilaya';
    end if;
    v_shipping := case when v_delivery_type = 'office'
      then v_delivery_row.office_price
      else v_delivery_row.home_price
    end;
  else
    v_shipping := v_settings.shipping_fee;
  end if;

  -- Free shipping keys off what the customer actually pays for goods.
  if (v_subtotal - v_discount) >= v_settings.free_ship_threshold then
    v_shipping := 0;
  end if;

  v_order_number := 'AM-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(md5(random()::text), 1, 5));

  insert into orders (
    order_number, customer_name, customer_phone, wilaya, city, address,
    notes, subtotal, shipping, discount, total, status, language, delivery_type
  ) values (
    v_order_number,
    customer->>'customer_name',
    customer->>'customer_phone',
    v_wilaya,
    customer->>'city',
    customer->>'address',
    customer->>'notes',
    v_subtotal,
    v_shipping,
    v_discount,
    v_subtotal - v_discount + v_shipping,
    'pending',
    coalesce(customer->>'language', 'fr'),
    v_delivery_type
  )
  returning id into v_order_id;

  -- Pass 2: snapshot line items and decrement stock (verified sufficient above).
  for v_item in select * from jsonb_array_elements(items)
  loop
    v_qty := (v_item->>'quantity')::int;

    select * into v_product from products where id = (v_item->>'product_id')::uuid;

    insert into order_items (
      order_id, product_id, name_fr, name_ar, price, quantity, color, size, image_url
    ) values (
      v_order_id,
      v_product.id,
      v_product.name_fr,
      v_product.name_ar,
      v_product.price,
      v_qty,
      v_item->>'color',
      v_item->>'size',
      (select url from product_images where product_id = v_product.id order by sort_order limit 1)
    );

    update products set stock = stock - v_qty where id = v_product.id;
  end loop;

  return v_order_number;
end;
$$;

grant execute on function place_order(jsonb, jsonb) to anon;

-- Guest order lookup: now also returns the discount so the recap matches.
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
