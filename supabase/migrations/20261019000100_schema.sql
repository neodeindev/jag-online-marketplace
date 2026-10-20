-- =============================================================================
-- Core schema: catalog, content, customers, orders.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'staff', 'owner');
create type public.product_status as enum ('active', 'hidden');
create type public.attribute_kind as enum ('select', 'color');
create type public.order_status as enum (
  'pending',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled'
);
create type public.payment_method as enum ('cash_on_delivery', 'bank_transfer', 'mmg');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');
create type public.review_status as enum ('pending', 'published', 'hidden');

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- URL-safe slug from any text: "Women's Dresses & Skirts" -> "womens-dresses-skirts"
create or replace function public.slugify(p_text text)
returns text
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent(replace(coalesce(p_text, ''), '''', ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- Price a shopper pays right now: the sale price while a sale is running.
create or replace function public.price_now(p_price numeric, p_sale_price numeric, p_sale_ends_at timestamptz)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when p_sale_price is not null
      and p_sale_price < p_price
      and (p_sale_ends_at is null or p_sale_ends_at > now())
    then p_sale_price
    else p_price
  end;
$$;

-- -----------------------------------------------------------------------------
-- Store settings (single row)
-- -----------------------------------------------------------------------------
create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'JAG Marketplace',
  tagline text,
  logo_url text,
  contact_email text,
  contact_phone text,
  whatsapp_number text,
  address text,
  business_hours text,
  currency_code text not null default 'GYD',
  currency_symbol text not null default 'G$',
  timezone text not null default 'America/Guyana',
  order_prefix text not null default 'JAG',
  order_notification_emails text[] not null default '{}',
  free_delivery_threshold numeric(12, 2) check (free_delivery_threshold is null or free_delivery_threshold >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  cash_on_delivery_enabled boolean not null default true,
  bank_transfer_enabled boolean not null default true,
  mmg_enabled boolean not null default true,
  bank_transfer_instructions text,
  mmg_instructions text,
  announcement text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  updated_at timestamptz not null default now()
);

create trigger store_settings_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Delivery zones
-- -----------------------------------------------------------------------------
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  fee numeric(12, 2) not null default 0 check (fee >= 0),
  estimated_days text,
  is_pickup boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger delivery_zones_updated_at
  before update on public.delivery_zones
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Profiles (one per auth user)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  permissions text[] not null default '{}',
  address_line text,
  city text,
  delivery_zone_id uuid references public.delivery_zones (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_email_idx on public.profiles (lower(email));

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Catalog: categories, brands, attributes
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create index categories_parent_idx on public.categories (parent_id);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- A category can't be moved under one of its own sub-categories.
create or replace function public.categories_prevent_cycle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.parent_id is not null and exists (
    with recursive ancestors as (
      select c.id, c.parent_id from public.categories c where c.id = new.parent_id
      union all
      select c.id, c.parent_id from public.categories c join ancestors a on c.id = a.parent_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'A category cannot be placed inside one of its own sub-categories.';
  end if;
  return new;
end;
$$;

create trigger categories_prevent_cycle
  before insert or update of parent_id on public.categories
  for each row execute function public.categories_prevent_cycle();

create or replace function public.category_subtree(p_category_id uuid)
returns table (id uuid)
language sql
stable
set search_path = public, pg_temp
as $$
  with recursive tree as (
    select c.id from public.categories c where c.id = p_category_id
    union all
    select c.id from public.categories c join tree t on c.parent_id = t.id
  )
  select tree.id from tree;
$$;

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index brands_name_unique on public.brands (lower(name));

create trigger brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind public.attribute_kind not null default 'select',
  -- Shown in the storefront filter sidebar
  is_filterable boolean not null default true,
  -- Shopper picks one value before adding to cart (e.g. Size)
  is_option boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index attributes_name_unique on public.attributes (lower(name));

create trigger attributes_updated_at
  before update on public.attributes
  for each row execute function public.set_updated_at();

create table public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  value text not null,
  slug text not null,
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (attribute_id, slug)
);

create index attribute_values_attribute_idx on public.attribute_values (attribute_id);

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
create sequence public.product_sku_seq start 1001;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  slug text not null unique,
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  sale_price numeric(12, 2) check (sale_price is null or sale_price >= 0),
  sale_ends_at timestamptz,
  sku text not null unique default ('SKU-' || lpad(nextval('public.product_sku_seq')::text, 6, '0')),
  stock integer not null default 0 check (stock >= 0),
  brand_id uuid references public.brands (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  status public.product_status not null default 'active',
  is_featured boolean not null default false,
  -- [{ "label": "Material", "value": "Cotton" }, ...]
  specifications jsonb not null default '[]'::jsonb check (jsonb_typeof(specifications) = 'array'),
  sold_count integer not null default 0,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  search_text text not null default '',
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence public.product_sku_seq owned by public.products.sku;

create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);
create index products_status_idx on public.products (status);
create index products_created_idx on public.products (created_at desc);
create index products_search_vector_idx on public.products using gin (search_vector);
create index products_search_text_trgm_idx on public.products using gin (search_text extensions.gin_trgm_ops);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  -- Set when the file lives in our storage bucket, so it can be removed later
  storage_path text,
  alt text,
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.product_attribute_values (
  product_id uuid not null references public.products (id) on delete cascade,
  attribute_value_id uuid not null references public.attribute_values (id) on delete cascade,
  primary key (product_id, attribute_value_id)
);

create index product_attribute_values_value_idx on public.product_attribute_values (attribute_value_id);

-- Search document: title, brand, category path, SKU, attribute values and description.
create or replace function public.products_refresh_search()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_brand text;
  v_categories text;
  v_attributes text;
begin
  select b.name into v_brand from public.brands b where b.id = new.brand_id;

  with recursive path as (
    select c.id, c.parent_id, c.name from public.categories c where c.id = new.category_id
    union all
    select c.id, c.parent_id, c.name from public.categories c join path p on c.id = p.parent_id
  )
  select string_agg(name, ' ') into v_categories from path;

  select string_agg(av.value, ' ') into v_attributes
  from public.product_attribute_values pav
  join public.attribute_values av on av.id = pav.attribute_value_id
  where pav.product_id = new.id;

  new.search_text := lower(extensions.unaccent(concat_ws(' ',
    new.title, v_brand, v_categories, new.sku, v_attributes, left(new.description, 2000)
  )));

  new.search_vector :=
    setweight(to_tsvector('english', extensions.unaccent(coalesce(new.title, ''))), 'A') ||
    setweight(to_tsvector('english', extensions.unaccent(concat_ws(' ', v_brand, v_categories))), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.sku, '')), 'B') ||
    setweight(to_tsvector('english', extensions.unaccent(coalesce(v_attributes, ''))), 'C') ||
    setweight(to_tsvector('english', extensions.unaccent(left(coalesce(new.description, ''), 4000))), 'D');

  return new;
end;
$$;

create trigger products_refresh_search
  before insert or update on public.products
  for each row execute function public.products_refresh_search();

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Keep product search documents current when related names change.
create or replace function public.touch_products_for_related()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'brands' then
    update public.products set search_text = search_text where brand_id = new.id;
  elsif tg_table_name = 'categories' then
    update public.products set search_text = search_text
    where category_id in (select id from public.category_subtree(new.id));
  elsif tg_table_name = 'attribute_values' then
    update public.products set search_text = search_text
    where id in (select product_id from public.product_attribute_values where attribute_value_id = new.id);
  end if;
  return new;
end;
$$;

create trigger brands_touch_products
  after update of name on public.brands
  for each row when (old.name is distinct from new.name)
  execute function public.touch_products_for_related();

create trigger categories_touch_products
  after update of name, parent_id on public.categories
  for each row when (old.name is distinct from new.name or old.parent_id is distinct from new.parent_id)
  execute function public.touch_products_for_related();

create trigger attribute_values_touch_products
  after update of value on public.attribute_values
  for each row when (old.value is distinct from new.value)
  execute function public.touch_products_for_related();

create or replace function public.product_attribute_values_touch()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.products set search_text = search_text
  where id = coalesce(new.product_id, old.product_id);
  return null;
end;
$$;

create trigger product_attribute_values_touch
  after insert or delete on public.product_attribute_values
  for each row execute function public.product_attribute_values_touch();

-- -----------------------------------------------------------------------------
-- Storefront content
-- -----------------------------------------------------------------------------
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cta_label text,
  link_url text,
  image_url text not null,
  storage_path text,
  -- 'hero' = homepage carousel, 'promo' = smaller tiles under the hero
  placement text not null default 'hero' check (placement in ('hero', 'promo')),
  -- 'split' = text on a coloured panel beside the image (works with product photos)
  -- 'cover' = image fills the banner with text over it (works with wide lifestyle photos)
  layout text not null default 'split' check (layout in ('split', 'cover')),
  -- Panel colour for split banners, overlay tint for cover banners
  theme text not null default 'forest' check (theme in ('forest', 'gold', 'red', 'mist', 'ink')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger banners_updated_at
  before update on public.banners
  for each row execute function public.set_updated_at();

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content text not null default '',
  is_published boolean not null default true,
  show_in_footer boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pages_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Customers: wishlist and reviews
-- -----------------------------------------------------------------------------
create table public.wishlist_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  is_verified_purchase boolean not null default false,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index reviews_product_idx on public.reviews (product_id, status);

create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create or replace function public.reviews_refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating_avg = coalesce(r.avg, 0),
    rating_count = coalesce(r.cnt, 0)
  from (
    select round(avg(rating)::numeric, 2) as avg, count(*)::int as cnt
    from public.reviews
    where product_id = v_product and status = 'published'
  ) r
  where p.id = v_product;
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_refresh_rating();

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create sequence public.order_number_seq start 100001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  -- Lets a guest open their own order page without an account
  access_token uuid not null default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  payment_reference text,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  address_line text,
  city text,
  delivery_zone_id uuid references public.delivery_zones (id) on delete set null,
  delivery_zone_name text not null,
  is_pickup boolean not null default false,
  delivery_notes text,
  subtotal numeric(12, 2) not null,
  delivery_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  item_count integer not null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index orders_phone_idx on public.orders (customer_phone);
create index orders_email_idx on public.orders (lower(customer_email));

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  title text not null,
  sku text,
  image_url text,
  -- Shopper's choices, e.g. { "Size": "M" }
  options jsonb not null default '{}'::jsonb,
  unit_price numeric(12, 2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status,
  note text,
  actor_id uuid references auth.users (id) on delete set null,
  customer_notified boolean not null default false,
  created_at timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);
