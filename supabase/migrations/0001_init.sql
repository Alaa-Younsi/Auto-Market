-- Auto Market: core schema
-- Cash-on-delivery car parts & accessories store (Algeria)

create extension if not exists "pgcrypto";

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_fr text not null,
  name_ar text not null,
  description_fr text,
  description_ar text,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_fr text not null,
  name_ar text not null,
  description_fr text,
  description_ar text,
  details_fr text[] not null default '{}',
  details_ar text[] not null default '{}',
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2),
  category_id uuid references categories (id) on delete set null,
  stock int not null default 0 check (stock >= 0),
  style_code text,
  colors jsonb not null default '[]',
  sizes jsonb not null default '[]',
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('active', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on products (category_id);
create index products_status_idx on products (status);
create index products_featured_idx on products (featured) where featured = true;

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0
);

create index product_images_product_id_idx on product_images (product_id);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_name text not null,
  customer_phone text not null,
  wilaya text not null,
  city text not null,
  address text not null,
  notes text,
  subtotal numeric(10, 2) not null,
  shipping numeric(10, 2) not null,
  total numeric(10, 2) not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  language text not null default 'fr',
  delivery_type text not null default 'home' check (delivery_type in ('home', 'office')),
  created_at timestamptz not null default now()
);

create index orders_status_idx on orders (status);
create index orders_created_at_idx on orders (created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  name_fr text not null,
  name_ar text not null,
  price numeric(10, 2) not null,
  quantity int not null check (quantity > 0),
  color text,
  size text,
  image_url text
);

create index order_items_order_id_idx on order_items (order_id);

create table store_settings (
  id int primary key default 1 check (id = 1),
  shipping_fee numeric(10, 2) not null default 500,
  free_ship_threshold numeric(10, 2) not null default 5000
);

insert into store_settings (id, shipping_fee, free_ship_threshold)
values (1, 500, 5000);

create table delivery_prices (
  id uuid primary key default gen_random_uuid(),
  wilaya text unique not null,
  home_price numeric(10, 2) not null default 500,
  office_price numeric(10, 2) not null default 350,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table client_reviews (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  stars int not null check (stars between 1 and 5),
  review_text text not null,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on products
  for each row
  execute function update_updated_at();

create or replace function update_delivery_prices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger delivery_prices_set_updated_at
  before update on delivery_prices
  for each row
  execute function update_delivery_prices_updated_at();

-- Seed categories (car parts & accessories)
insert into categories (slug, name_fr, name_ar, sort_order) values
  ('eclairage', 'Éclairage', 'الإضاءة', 1),
  ('interieur', 'Intérieur', 'المقصورة الداخلية', 2),
  ('exterieur', 'Extérieur', 'الخارجية', 3),
  ('performance', 'Performance', 'الأداء', 4),
  ('audio-multimedia', 'Audio & Multimédia', 'الصوت والوسائط', 5),
  ('entretien', 'Entretien', 'الصيانة', 6),
  ('outillage', 'Outillage', 'العدة', 7),
  ('securite', 'Sécurité', 'الأمان', 8);

-- Seed delivery prices for all 58 Algerian wilayas
insert into delivery_prices (wilaya, home_price, office_price) values
  ('Adrar', 900, 700),
  ('Chlef', 500, 350),
  ('Laghouat', 700, 500),
  ('Oum El Bouaghi', 550, 400),
  ('Batna', 550, 400),
  ('Béjaïa', 500, 350),
  ('Biskra', 650, 450),
  ('Béchar', 900, 700),
  ('Blida', 400, 300),
  ('Bouira', 450, 350),
  ('Tamanrasset', 1200, 950),
  ('Tébessa', 600, 450),
  ('Tlemcen', 550, 400),
  ('Tiaret', 550, 400),
  ('Tizi Ouzou', 450, 350),
  ('Alger', 350, 250),
  ('Djelfa', 650, 450),
  ('Jijel', 550, 400),
  ('Sétif', 500, 350),
  ('Saïda', 600, 450),
  ('Skikda', 550, 400),
  ('Sidi Bel Abbès', 550, 400),
  ('Annaba', 550, 400),
  ('Guelma', 550, 400),
  ('Constantine', 500, 350),
  ('Médéa', 450, 350),
  ('Mostaganem', 550, 400),
  ('M''Sila', 600, 450),
  ('Mascara', 550, 400),
  ('Ouargla', 800, 600),
  ('Oran', 500, 350),
  ('El Bayadh', 800, 600),
  ('Illizi', 1300, 1000),
  ('Bordj Bou Arréridj', 500, 350),
  ('Boumerdès', 400, 300),
  ('El Tarf', 600, 450),
  ('Tindouf', 1300, 1000),
  ('Tissemsilt', 600, 450),
  ('El Oued', 750, 550),
  ('Khenchela', 600, 450),
  ('Souk Ahras', 600, 450),
  ('Tipaza', 400, 300),
  ('Mila', 550, 400),
  ('Aïn Defla', 500, 350),
  ('Naâma', 850, 650),
  ('Aïn Témouchent', 550, 400),
  ('Ghardaïa', 750, 550),
  ('Relizane', 550, 400),
  ('Timimoun', 1000, 800),
  ('Bordj Badji Mokhtar', 1400, 1100),
  ('Ouled Djellal', 700, 500),
  ('Béni Abbès', 1000, 800),
  ('In Salah', 1200, 950),
  ('In Guezzam', 1400, 1100),
  ('Touggourt', 750, 550),
  ('Djanet', 1300, 1000),
  ('El M''Ghair', 750, 550),
  ('El Meniaa', 900, 700);
