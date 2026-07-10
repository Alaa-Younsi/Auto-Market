-- Row Level Security
-- NOTE: `authenticated` policies below grant full admin access to any
-- Supabase Auth session. Before go-live, disable public sign-up in
-- Authentication > Settings, otherwise anyone can self-register into
-- admin access via the anon key already shipped in the frontend bundle.

alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table store_settings enable row level security;
alter table delivery_prices enable row level security;
alter table client_reviews enable row level security;

-- categories: public read, admin write
create policy "categories_anon_select" on categories
  for select to anon using (true);
create policy "categories_authenticated_all" on categories
  for all to authenticated using (true) with check (true);

-- products: public read active only, admin full
create policy "products_anon_select_active" on products
  for select to anon using (status = 'active');
create policy "products_authenticated_all" on products
  for all to authenticated using (true) with check (true);

-- product_images: public read, admin write
create policy "product_images_anon_select" on product_images
  for select to anon using (true);
create policy "product_images_authenticated_all" on product_images
  for all to authenticated using (true) with check (true);

-- store_settings: public read, admin write
create policy "store_settings_anon_select" on store_settings
  for select to anon using (true);
create policy "store_settings_authenticated_all" on store_settings
  for all to authenticated using (true) with check (true);

-- delivery_prices: public read, admin write
create policy "delivery_prices_anon_select" on delivery_prices
  for select to anon using (true);
create policy "delivery_prices_authenticated_all" on delivery_prices
  for all to authenticated using (true) with check (true);

-- client_reviews: public read active only, admin full
create policy "client_reviews_anon_select_active" on client_reviews
  for select to anon using (active = true);
create policy "client_reviews_authenticated_all" on client_reviews
  for all to authenticated using (true) with check (true);

-- orders / order_items: NO anon select/insert policy.
-- Writes go exclusively through the place_order() SECURITY DEFINER RPC.
-- Reads for guests go exclusively through get_order_by_number() RPC.
create policy "orders_authenticated_all" on orders
  for all to authenticated using (true) with check (true);
create policy "order_items_authenticated_all" on order_items
  for all to authenticated using (true) with check (true);
