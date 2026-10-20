-- =============================================================================
-- Bulk product import (CSV rows already parsed into JSON by the dashboard).
--
-- Each row:
-- {
--   "sku": "TSHIRT-001",               -- matches an existing product to update it
--   "title": "...", "description": "...",
--   "price": 2500, "sale_price": 1999, "stock": 12,
--   "brand": "Nike",
--   "category": "Fashion > Men > T-Shirts",  -- created if missing
--   "status": "active" | "hidden", "featured": true,
--   "attributes": { "Size": ["S", "M"], "Colour": ["Black"] },
--   "specifications": [ { "label": "Material", "value": "Cotton" } ],
--   "images": [ "https://..." ]
-- }
-- Keys that are missing (or null) leave the existing value unchanged.
-- Runs as the signed-in user, so row level security applies.
-- =============================================================================

create or replace function public.find_or_create_category_path(p_path text)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_parent uuid := null;
  v_id uuid;
  v_name text;
  v_slug text;
begin
  foreach v_name in array regexp_split_to_array(coalesce(p_path, ''), '\s*[>/]\s*')
  loop
    v_name := trim(v_name);
    continue when v_name = '';

    select c.id into v_id from public.categories c
    where lower(c.name) = lower(v_name) and c.parent_id is not distinct from v_parent
    limit 1;

    if v_id is null then
      v_slug := public.slugify(v_name);
      if v_slug = '' then
        v_slug := 'category';
      end if;
      if exists (select 1 from public.categories where slug = v_slug) and v_parent is not null then
        v_slug := (select slug from public.categories where id = v_parent) || '-' || v_slug;
      end if;
      if exists (select 1 from public.categories where slug = v_slug) then
        v_slug := v_slug || '-' || substr(md5(random()::text), 1, 5);
      end if;
      insert into public.categories (parent_id, name, slug)
      values (v_parent, v_name, v_slug)
      returning id into v_id;
    end if;

    v_parent := v_id;
  end loop;

  return v_parent;
end;
$$;

create or replace function public.find_or_create_brand(p_name text)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_id uuid;
  v_slug text;
begin
  if v_name is null then
    return null;
  end if;
  select id into v_id from public.brands where lower(name) = lower(v_name);
  if v_id is null then
    v_slug := public.slugify(v_name);
    if v_slug = '' or exists (select 1 from public.brands where slug = v_slug) then
      v_slug := coalesce(nullif(v_slug, ''), 'brand') || '-' || substr(md5(random()::text), 1, 5);
    end if;
    insert into public.brands (name, slug) values (v_name, v_slug) returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.find_or_create_attribute_value(p_attribute text, p_value text)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_attr text := nullif(trim(coalesce(p_attribute, '')), '');
  v_value text := nullif(trim(coalesce(p_value, '')), '');
  v_attribute_id uuid;
  v_value_id uuid;
  v_slug text;
begin
  if v_attr is null or v_value is null then
    return null;
  end if;

  select id into v_attribute_id from public.attributes where lower(name) = lower(v_attr);
  if v_attribute_id is null then
    v_slug := public.slugify(v_attr);
    if v_slug = '' or exists (select 1 from public.attributes where slug = v_slug) then
      v_slug := coalesce(nullif(v_slug, ''), 'attribute') || '-' || substr(md5(random()::text), 1, 5);
    end if;
    insert into public.attributes (name, slug, kind)
    values (v_attr, v_slug, case when v_attr ~* '^colou?rs?$' then 'color'::public.attribute_kind else 'select' end)
    returning id into v_attribute_id;
  end if;

  select id into v_value_id from public.attribute_values
  where attribute_id = v_attribute_id and lower(value) = lower(v_value);
  if v_value_id is null then
    v_slug := public.slugify(v_value);
    if v_slug = '' or exists (select 1 from public.attribute_values where attribute_id = v_attribute_id and slug = v_slug) then
      v_slug := coalesce(nullif(v_slug, ''), 'value') || '-' || substr(md5(random()::text), 1, 5);
    end if;
    insert into public.attribute_values (attribute_id, value, slug, sort_order)
    values (
      v_attribute_id, v_value, v_slug,
      coalesce((select max(sort_order) + 1 from public.attribute_values where attribute_id = v_attribute_id), 0)
    )
    returning id into v_value_id;
  end if;

  return v_value_id;
end;
$$;

-- Set a product's images to the given URLs, keeping rows (and their storage
-- files) for URLs that are already attached.
create or replace function public.sync_product_image_urls(p_product_id uuid, p_urls text[])
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_url text;
  v_index integer := 0;
begin
  delete from public.product_images
  where product_id = p_product_id and not (url = any (p_urls));

  foreach v_url in array p_urls
  loop
    if exists (select 1 from public.product_images where product_id = p_product_id and url = v_url) then
      update public.product_images set sort_order = v_index
      where product_id = p_product_id and url = v_url;
    else
      insert into public.product_images (product_id, url, sort_order) values (p_product_id, v_url, v_index);
    end if;
    v_index := v_index + 1;
  end loop;
end;
$$;

create or replace function public.admin_import_products(p_rows jsonb)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  v_index integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_product_id uuid;
  v_sku text;
  v_title text;
  v_slug text;
  v_action text;
  v_attr record;
  v_value text;
  v_value_ids uuid[];
  v_urls text[];
begin
  if not public.has_permission('products') then
    raise exception 'You don''t have permission to import products.';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Expected a list of rows.';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_index := v_index + 1;
    v_sku := nullif(trim(coalesce(v_row ->> 'sku', '')), '');
    v_title := nullif(trim(coalesce(v_row ->> 'title', '')), '');

    begin
      v_product_id := null;
      if v_sku is not null then
        select id into v_product_id from public.products where lower(sku) = lower(v_sku);
      end if;

      if v_product_id is null then
        if v_title is null then
          raise exception 'Title is required for new products.';
        end if;
        if v_row ->> 'price' is null then
          raise exception 'Price is required for new products.';
        end if;

        v_slug := public.slugify(v_title);
        if v_slug = '' then
          v_slug := 'product';
        end if;
        if exists (select 1 from public.products where slug = v_slug) then
          v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
        end if;

        insert into public.products (title, slug, price, sku)
        values (v_title, v_slug, (v_row ->> 'price')::numeric, coalesce(v_sku, 'SKU-' || lpad(nextval('public.product_sku_seq')::text, 6, '0')))
        returning id into v_product_id;
        v_action := 'created';
      else
        v_action := 'updated';
      end if;

      update public.products p set
        title = coalesce(v_title, p.title),
        description = coalesce(v_row ->> 'description', p.description),
        price = coalesce((v_row ->> 'price')::numeric, p.price),
        sale_price = case
          when v_row ? 'sale_price' then nullif(v_row ->> 'sale_price', '')::numeric
          else p.sale_price
        end,
        stock = coalesce((v_row ->> 'stock')::integer, p.stock),
        status = coalesce((v_row ->> 'status')::public.product_status, p.status),
        is_featured = coalesce((v_row ->> 'featured')::boolean, p.is_featured),
        brand_id = case
          when v_row ? 'brand' then public.find_or_create_brand(v_row ->> 'brand')
          else p.brand_id
        end,
        category_id = case
          when v_row ? 'category' and nullif(trim(coalesce(v_row ->> 'category', '')), '') is not null
            then public.find_or_create_category_path(v_row ->> 'category')
          when v_row ? 'category' then null
          else p.category_id
        end,
        specifications = case
          when jsonb_typeof(v_row -> 'specifications') = 'array' then v_row -> 'specifications'
          else p.specifications
        end
      where p.id = v_product_id;

      if jsonb_typeof(v_row -> 'attributes') = 'object' then
        v_value_ids := '{}';
        for v_attr in select key, value from jsonb_each(v_row -> 'attributes')
        loop
          if jsonb_typeof(v_attr.value) = 'array' then
            for v_value in select jsonb_array_elements_text(v_attr.value)
            loop
              v_value_ids := v_value_ids || public.find_or_create_attribute_value(v_attr.key, v_value);
            end loop;
          end if;
        end loop;

        delete from public.product_attribute_values
        where product_id = v_product_id and not (attribute_value_id = any (v_value_ids));
        insert into public.product_attribute_values (product_id, attribute_value_id)
        select v_product_id, vid from unnest(v_value_ids) vid where vid is not null
        on conflict do nothing;
      end if;

      if jsonb_typeof(v_row -> 'images') = 'array' and jsonb_array_length(v_row -> 'images') > 0 then
        select array_agg(u) into v_urls
        from jsonb_array_elements_text(v_row -> 'images') u
        where u ~* '^https?://';
        if v_urls is not null then
          perform public.sync_product_image_urls(v_product_id, v_urls);
        end if;
      end if;

      select sku into v_sku from public.products where id = v_product_id;
      v_results := v_results || jsonb_build_object('row', v_index, 'sku', v_sku, 'status', v_action);
    exception when others then
      v_results := v_results || jsonb_build_object(
        'row', v_index, 'sku', v_sku, 'status', 'error', 'message', sqlerrm
      );
    end;
  end loop;

  return v_results;
end;
$$;

revoke execute on function public.find_or_create_category_path(text) from public, anon;
revoke execute on function public.find_or_create_brand(text) from public, anon;
revoke execute on function public.find_or_create_attribute_value(text, text) from public, anon;
revoke execute on function public.sync_product_image_urls(uuid, text[]) from public, anon;
revoke execute on function public.admin_import_products(jsonb) from public, anon;
grant execute on function public.admin_import_products(jsonb) to authenticated;
