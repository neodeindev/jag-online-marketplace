-- =============================================================================
-- Data API privileges.
--
-- Newer Supabase projects no longer grant table privileges to the API roles
-- automatically, so they are granted explicitly here. Row level security
-- (enabled on every table) still decides which rows each role can see or
-- change. Shoppers who aren't signed in only ever read tables directly; every
-- write goes through a function or requires an account.
--
-- A table-level grant overrides column-level restrictions, so the revokes and
-- column grants from 20261019000200_security.sql are re-applied below.
-- Tables added by later migrations need their own grants.
-- =============================================================================

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to service_role;

-- Role and permissions are only changed through owner functions.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, address_line, city, delivery_zone_id) on public.profiles to authenticated;

-- Counters and search columns are maintained by triggers and order functions only.
revoke update on public.products from anon, authenticated;
grant update (
  title, slug, description, price, sale_price, sale_ends_at, sku, stock,
  brand_id, category_id, status, is_featured, specifications
) on public.products to authenticated;

-- Reviews are written through submit_review(); staff may only change status.
revoke insert, update on public.reviews from anon, authenticated;
grant update (status) on public.reviews to authenticated;

-- Orders are created by place_order() and changed by admin_update_order().
revoke insert, update on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
revoke insert, update, delete on public.order_events from anon, authenticated;
grant update (admin_notes, payment_reference) on public.orders to authenticated;
