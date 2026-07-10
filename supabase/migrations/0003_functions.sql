-- Server-side order placement. Never trust client-sent prices.
create or replace function place_order(items jsonb, customer jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product products%rowtype;
  v_qty int;
  v_subtotal numeric(10, 2) := 0;
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

  -- Pass 1: validate every item (quantity, existence, stock) before mutating anything.
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

    if v_product.stock < v_qty then
      raise exception 'ERR_STOCK: insufficient stock for %', v_product.name_fr;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  end loop;

  -- Resolve shipping from delivery_prices, falling back to store_settings.
  select * into v_delivery_row from delivery_prices where wilaya = v_wilaya;
  select * into v_settings from store_settings where id = 1;

  if found and v_delivery_row.wilaya is not null then
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

  if v_subtotal >= v_settings.free_ship_threshold then
    v_shipping := 0;
  end if;

  v_order_number := 'AM-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(md5(random()::text), 1, 5));

  insert into orders (
    order_number, customer_name, customer_phone, wilaya, city, address,
    notes, subtotal, shipping, total, status, language, delivery_type
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
    v_subtotal + v_shipping,
    'pending',
    coalesce(customer->>'language', 'fr'),
    v_delivery_type
  )
  returning id into v_order_id;

  -- Pass 2: snapshot line items and decrement stock (already verified sufficient above).
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

-- Guest order lookup: minimal fields only, never phone/address/notes.
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
    'total', v_order.total,
    'status', v_order.status,
    'created_at', v_order.created_at,
    'items', v_items
  );
end;
$$;

grant execute on function get_order_by_number(text) to anon;
