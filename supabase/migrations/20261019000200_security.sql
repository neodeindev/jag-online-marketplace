-- =============================================================================
-- Roles, permissions, row level security and storage.
--
-- Roles:
--   owner    - full access, manages staff and store settings
--   staff    - access limited to the sections listed in profiles.permissions
--   customer - shoppers with an account
--
-- Staff permission keys: products, orders, content, customers
-- =============================================================================

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('staff', 'owner')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'owner'
  );
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and (role = 'owner' or (role = 'staff' and p_permission = any (permissions)))
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
alter table public.store_settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.attributes enable row level security;
alter table public.attribute_values enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_attribute_values enable row level security;
alter table public.banners enable row level security;
alter table public.pages enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

-- -----------------------------------------------------------------------------
-- Store settings & delivery zones: public read, owner write
-- -----------------------------------------------------------------------------
create policy "Anyone can read store settings" on public.store_settings
  for select using (true);
create policy "Owner updates store settings" on public.store_settings
  for update using ((select public.is_owner())) with check ((select public.is_owner()));

create policy "Anyone can read delivery zones" on public.delivery_zones
  for select using (true);
create policy "Owner manages delivery zones" on public.delivery_zones
  for all using ((select public.is_owner())) with check ((select public.is_owner()));

-- -----------------------------------------------------------------------------
-- Profiles
-- -----------------------------------------------------------------------------
create policy "Users read own profile; staff read customers" on public.profiles
  for select using (
    id = (select auth.uid())
    or (select public.has_permission('customers'))
    or (select public.has_permission('orders'))
  );
create policy "Users update own profile" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Role and permissions are only changed through owner functions.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, address_line, city, delivery_zone_id) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Catalog
-- -----------------------------------------------------------------------------
create policy "Anyone can read categories" on public.categories for select using (true);
create policy "Product managers manage categories" on public.categories
  for all using ((select public.has_permission('products')))
  with check ((select public.has_permission('products')));

create policy "Anyone can read brands" on public.brands for select using (true);
create policy "Product managers manage brands" on public.brands
  for all using ((select public.has_permission('products')))
  with check ((select public.has_permission('products')));

create policy "Anyone can read attributes" on public.attributes for select using (true);
create policy "Product managers manage attributes" on public.attributes
  for all using ((select public.has_permission('products')))
  with check ((select public.has_permission('products')));

create policy "Anyone can read attribute values" on public.attribute_values for select using (true);
create policy "Product managers manage attribute values" on public.attribute_values
  for all using ((select public.has_permission('products')))
  with check ((select public.has_permission('products')));

create policy "Shoppers read active products; staff read all" on public.products
  for select using (
    status = 'active'
    or (select public.has_permission('products'))
    or (select public.has_permission('orders'))
  );
create policy "Product managers insert products" on public.products
  for insert with check ((select public.has_permission('products')));
create policy "Product managers update products" on public.products
  for update using ((select public.has_permission('products')))
  with check ((select public.has_permission('products')));
create policy "Product managers delete products" on public.products
  for delete using ((select public.has_permission('products')));

-- Counters and search columns are maintained by triggers and order functions only.
revoke update on public.products from anon, authenticated;
grant update (
  title, slug, description, price, sale_price, sale_ends_at, sku, stock,
  brand_id, category_id, status, is_featured, specifications
) on public.products to authenticated;

create policy "Anyone can read product images" on public.product_images for select using (true);
create policy "Product managers manage product images" on public.product_images
  for all using ((select public.has_permission('products')))
  with check ((select public.has_permission('products')));

create policy "Anyone can read product attributes" on public.product_attribute_values for select using (true);
create policy "Product managers manage product attributes" on public.product_attribute_values
  for all using ((select public.has_permission('products')))
  with check ((select public.has_permission('products')));

-- -----------------------------------------------------------------------------
-- Content
-- -----------------------------------------------------------------------------
create policy "Shoppers read live banners; editors read all" on public.banners
  for select using (
    (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or (select public.has_permission('content'))
  );
create policy "Content editors manage banners" on public.banners
  for all using ((select public.has_permission('content')))
  with check ((select public.has_permission('content')));

create policy "Shoppers read published pages; editors read all" on public.pages
  for select using (is_published or (select public.has_permission('content')));
create policy "Content editors manage pages" on public.pages
  for all using ((select public.has_permission('content')))
  with check ((select public.has_permission('content')));

-- -----------------------------------------------------------------------------
-- Wishlist & reviews
-- -----------------------------------------------------------------------------
create policy "Users manage own wishlist" on public.wishlist_items
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Shoppers read published reviews; authors and staff read theirs" on public.reviews
  for select using (
    status = 'published'
    or user_id = (select auth.uid())
    or (select public.has_permission('products'))
  );
create policy "Product managers moderate reviews" on public.reviews
  for update using ((select public.has_permission('products')))
  with check ((select public.has_permission('products')));
create policy "Authors and product managers delete reviews" on public.reviews
  for delete using (user_id = (select auth.uid()) or (select public.has_permission('products')));

-- Reviews are written through submit_review(); staff may only change status.
revoke insert, update on public.reviews from anon, authenticated;
grant update (status) on public.reviews to authenticated;

-- -----------------------------------------------------------------------------
-- Orders: created by place_order(), changed by admin_update_order()
-- -----------------------------------------------------------------------------
create policy "Customers read own orders; order staff read all" on public.orders
  for select using (user_id = (select auth.uid()) or (select public.has_permission('orders')));
create policy "Owner deletes orders" on public.orders
  for delete using ((select public.is_owner()));

create policy "Order items follow their order" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = (select auth.uid()) or (select public.has_permission('orders')))
    )
  );

create policy "Order staff read order events" on public.order_events
  for select using ((select public.has_permission('orders')));

revoke insert, update on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
revoke insert, update, delete on public.order_events from anon, authenticated;
grant update (admin_notes, payment_reference) on public.orders to authenticated;
create policy "Order staff edit notes" on public.orders
  for update using ((select public.has_permission('orders')))
  with check ((select public.has_permission('orders')));

-- -----------------------------------------------------------------------------
-- Storage buckets
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('site-assets', 'site-assets', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do nothing;

create policy "Product managers upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.has_permission('products')));
create policy "Product managers update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.has_permission('products')));
create policy "Product managers delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.has_permission('products')));

create policy "Editors upload site assets" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-assets'
    and ((select public.has_permission('content')) or (select public.has_permission('products')))
  );
create policy "Editors update site assets" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'site-assets'
    and ((select public.has_permission('content')) or (select public.has_permission('products')))
  );
create policy "Editors delete site assets" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'site-assets'
    and ((select public.has_permission('content')) or (select public.has_permission('products')))
  );
