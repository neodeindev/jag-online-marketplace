-- =============================================================================
-- Storefront search: typo-tolerant matching, filters, facets and suggestions.
--
-- Matching runs in two passes. The strict pass requires every word in the query
-- to prefix-match the product's search document (so "sams gal" finds
-- "Samsung Galaxy"). Only when nothing matches does the fuzzy pass run, which
-- also accepts words that are spelled similarly (trigram similarity), so
-- "samsng chargr" still finds "Samsung Charger".
-- =============================================================================

create or replace function public.search_tokens(p_query text)
returns text[]
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select coalesce(array_agg(tok), '{}')
  from (
    select tok
    from regexp_split_to_table(
      regexp_replace(lower(extensions.unaccent(coalesce(p_query, ''))), '[^a-z0-9]+', ' ', 'g'),
      ' '
    ) as tok
    where tok <> ''
    limit 10
  ) t;
$$;

-- Base result set: query + category. Returns product ids with a relevance score.
create or replace function public.search_base(p_query text default null, p_category_slug text default null)
returns table (product_id uuid, score real, is_fuzzy boolean)
language plpgsql
stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_tokens text[] := public.search_tokens(p_query);
  v_norm text := array_to_string(v_tokens, ' ');
  v_category_ids uuid[];
  v_all_query tsquery;
begin
  if p_category_slug is not null and p_category_slug <> '' then
    select array_agg(s.id) into v_category_ids
    from public.categories c, public.category_subtree(c.id) s
    where c.slug = p_category_slug;

    if v_category_ids is null then
      return;
    end if;
  end if;

  if cardinality(v_tokens) = 0 then
    return query
      select p.id, 0::real, false
      from public.products p
      where p.status = 'active'
        and (v_category_ids is null or p.category_id = any (v_category_ids));
    return;
  end if;

  -- Combined prefix query used for ranking. Stop words drop out automatically.
  select to_tsquery('english', string_agg(tok || ':*', ' & '))
  into v_all_query
  from unnest(v_tokens) tok;

  -- Pass 1: every meaningful word prefix-matches.
  return query
    with toks as (
      select tok, to_tsquery('english', tok || ':*') as q from unnest(v_tokens) tok
    )
    select
      p.id,
      (
        ts_rank_cd(p.search_vector, v_all_query) * 4
        + extensions.similarity(v_norm, lower(extensions.unaccent(p.title)))
      )::real,
      false
    from public.products p
    where p.status = 'active'
      and (v_category_ids is null or p.category_id = any (v_category_ids))
      and not exists (
        select 1 from toks
        where numnode(toks.q) > 0 and not (p.search_vector @@ toks.q)
      );

  if found then
    return;
  end if;

  -- Pass 2: allow near-miss spellings for words of 4+ letters.
  return query
    with toks as (
      select tok, to_tsquery('english', tok || ':*') as q from unnest(v_tokens) tok
    )
    select
      p.id,
      extensions.word_similarity(v_norm, p.search_text)::real,
      true
    from public.products p
    where p.status = 'active'
      and (v_category_ids is null or p.category_id = any (v_category_ids))
      and not exists (
        select 1 from toks
        where numnode(toks.q) > 0
          and not (
            p.search_vector @@ toks.q
            or (length(toks.tok) >= 4 and extensions.word_similarity(toks.tok, p.search_text) >= 0.45)
          )
      );
end;
$$;

-- Product listing with filters, sorting and pagination.
--   p_attrs: ["size:m", "colour:red"] (attribute slug : value slug).
--            Values of the same attribute are OR-ed; different attributes are AND-ed.
--   p_sort:  relevance | featured | price_asc | price_desc | newest | best_selling | rating
--   p_ids:   limit results to these products (wishlist, recently viewed)
create or replace function public.search_products(
  p_query text default null,
  p_category_slug text default null,
  p_brand_slugs text[] default null,
  p_attrs text[] default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_in_stock boolean default false,
  p_on_sale boolean default false,
  p_featured boolean default false,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0,
  p_ids uuid[] default null
)
returns table (
  id uuid,
  slug text,
  title text,
  brand_name text,
  price numeric,
  current_price numeric,
  sale_ends_at timestamptz,
  stock integer,
  image_url text,
  hover_image_url text,
  rating_avg numeric,
  rating_count integer,
  colors jsonb,
  has_options boolean,
  is_fuzzy boolean,
  total_count bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  with base as (
    select * from public.search_base(p_query, p_category_slug)
  ),
  attr_sel as (
    select av.attribute_id, array_agg(av.id) as ids
    from public.attribute_values av
    join public.attributes a on a.id = av.attribute_id
    where p_attrs is not null and (a.slug || ':' || av.slug) = any (p_attrs)
    group by av.attribute_id
  ),
  filtered as (
    select
      p.*,
      b.score,
      b.is_fuzzy as fuzzy,
      public.price_now(p.price, p.sale_price, p.sale_ends_at) as cur
    from base b
    join public.products p on p.id = b.product_id
    where (
        p_brand_slugs is null or cardinality(p_brand_slugs) = 0
        or p.brand_id in (select br.id from public.brands br where br.slug = any (p_brand_slugs))
      )
      and not exists (
        select 1 from attr_sel s
        where not exists (
          select 1 from public.product_attribute_values pav
          where pav.product_id = p.id and pav.attribute_value_id = any (s.ids)
        )
      )
      and (not coalesce(p_in_stock, false) or p.stock > 0)
      and (not coalesce(p_featured, false) or p.is_featured)
      and (p_ids is null or p.id = any (p_ids))
  ),
  priced as (
    select f.*, count(*) over () as total
    from filtered f
    where (p_min_price is null or f.cur >= p_min_price)
      and (p_max_price is null or f.cur <= p_max_price)
      and (not coalesce(p_on_sale, false) or f.cur < f.price)
  )
  select
    f.id,
    f.slug,
    f.title,
    (select br.name from public.brands br where br.id = f.brand_id),
    f.price,
    f.cur,
    case when f.cur < f.price then f.sale_ends_at end,
    f.stock,
    (select i.url from public.product_images i where i.product_id = f.id order by i.sort_order, i.created_at limit 1),
    (select i.url from public.product_images i where i.product_id = f.id order by i.sort_order, i.created_at offset 1 limit 1),
    f.rating_avg,
    f.rating_count,
    coalesce((
      select jsonb_agg(jsonb_build_object('name', av.value, 'hex', av.color_hex) order by av.sort_order, av.value)
      from public.product_attribute_values pav
      join public.attribute_values av on av.id = pav.attribute_value_id
      join public.attributes a on a.id = av.attribute_id
      where pav.product_id = f.id and a.kind = 'color'
    ), '[]'::jsonb),
    exists (
      select 1
      from public.product_attribute_values pav
      join public.attribute_values av on av.id = pav.attribute_value_id
      join public.attributes a on a.id = av.attribute_id
      where pav.product_id = f.id and a.is_option
    ),
    f.fuzzy,
    f.total
  from priced f
  order by
    case when p_sort = 'price_asc' then f.cur end asc,
    case when p_sort = 'price_desc' then f.cur end desc,
    case when p_sort = 'newest' then f.created_at end desc,
    case when p_sort = 'best_selling' then f.sold_count end desc,
    case when p_sort = 'rating' then f.rating_avg end desc,
    case when p_sort = 'rating' then f.rating_count end desc,
    case when p_sort in ('relevance', 'featured') then (f.stock > 0) end desc,
    case when p_sort = 'relevance' then f.score end desc,
    f.is_featured desc,
    f.sold_count desc,
    f.created_at desc,
    f.id
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- Filter sidebar options for the current query + category.
create or replace function public.search_facets(p_query text default null, p_category_slug text default null)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  with recursive
  bp as (
    select p.id, p.category_id, p.brand_id, p.stock,
      public.price_now(p.price, p.sale_price, p.sale_ends_at) as cur,
      p.price
    from public.search_base(p_query, p_category_slug) b
    join public.products p on p.id = b.product_id
  ),
  current_cat as (
    select c.id from public.categories c where c.slug = p_category_slug
  ),
  child_cats as (
    select c.id, c.name, c.slug, c.sort_order
    from public.categories c
    where c.is_active
      and (
        (p_category_slug is null and c.parent_id is null)
        or c.parent_id = (select id from current_cat)
      )
  ),
  tree as (
    select cc.id, cc.id as top_id from child_cats cc
    union all
    select k.id, t.top_id from public.categories k join tree t on k.parent_id = t.id
  ),
  category_counts as (
    select cc.slug, cc.name, cc.sort_order, count(distinct bp.id) as cnt
    from child_cats cc
    join tree t on t.top_id = cc.id
    join bp on bp.category_id = t.id
    group by cc.slug, cc.name, cc.sort_order
  ),
  brand_counts as (
    select br.slug, br.name, count(*) as cnt
    from bp join public.brands br on br.id = bp.brand_id
    group by br.slug, br.name
  ),
  attr_counts as (
    select a.id as attribute_id, a.slug as attr_slug, a.name as attr_name, a.kind, a.sort_order as attr_sort,
      av.slug, av.value, av.color_hex, av.sort_order, count(distinct bp.id) as cnt
    from bp
    join public.product_attribute_values pav on pav.product_id = bp.id
    join public.attribute_values av on av.id = pav.attribute_value_id
    join public.attributes a on a.id = av.attribute_id
    where a.is_filterable
    group by a.id, a.slug, a.name, a.kind, a.sort_order, av.slug, av.value, av.color_hex, av.sort_order
  )
  select jsonb_build_object(
    'total', (select count(*) from bp),
    'in_stock', (select count(*) from bp where stock > 0),
    'on_sale', (select count(*) from bp where cur < price),
    'price', jsonb_build_object('min', (select min(cur) from bp), 'max', (select max(cur) from bp)),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'count', cnt) order by sort_order, name)
      from category_counts where cnt > 0
    ), '[]'::jsonb),
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'count', cnt) order by name)
      from brand_counts
    ), '[]'::jsonb),
    'attributes', coalesce((
      select jsonb_agg(attr order by attr_sort, attr_name)
      from (
        select attr_sort, attr_name, jsonb_build_object(
          'slug', attr_slug,
          'name', attr_name,
          'kind', kind,
          'values', jsonb_agg(
            jsonb_build_object('slug', slug, 'value', value, 'hex', color_hex, 'count', cnt)
            order by sort_order, value
          )
        ) as attr
        from attr_counts
        group by attribute_id, attr_slug, attr_name, kind, attr_sort
      ) grouped
    ), '[]'::jsonb)
  );
$$;

-- Search-as-you-type dropdown: a few products, categories and brands.
create or replace function public.search_suggestions(p_query text)
returns jsonb
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with q as (
    select array_to_string(public.search_tokens(p_query), ' ') as norm
  ),
  products as (
    select p.slug, p.title,
      public.price_now(p.price, p.sale_price, p.sale_ends_at) as current_price,
      (select i.url from public.product_images i where i.product_id = p.id order by i.sort_order, i.created_at limit 1) as image_url,
      b.score
    from public.search_base(p_query, null) b
    join public.products p on p.id = b.product_id
    order by b.score desc, p.sold_count desc
    limit 6
  ),
  cats as (
    select c.slug, c.name, parent.name as parent_name,
      extensions.word_similarity((select norm from q), lower(extensions.unaccent(c.name))) as sim
    from public.categories c
    left join public.categories parent on parent.id = c.parent_id
    where c.is_active and (select norm from q) <> ''
      and (
        lower(extensions.unaccent(c.name)) like '%' || (select norm from q) || '%'
        or extensions.word_similarity((select norm from q), lower(extensions.unaccent(c.name))) >= 0.5
      )
    order by sim desc, c.name
    limit 4
  ),
  brs as (
    select br.slug, br.name
    from public.brands br
    where (select norm from q) <> ''
      and (
        lower(extensions.unaccent(br.name)) like (select norm from q) || '%'
        or extensions.word_similarity((select norm from q), lower(extensions.unaccent(br.name))) >= 0.6
      )
    order by br.name
    limit 3
  )
  select jsonb_build_object(
    'products', coalesce((select jsonb_agg(to_jsonb(products) - 'score') from products), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(cats) - 'sim') from cats), '[]'::jsonb),
    'brands', coalesce((select jsonb_agg(to_jsonb(brs)) from brs), '[]'::jsonb)
  );
$$;

grant execute on function public.search_base(text, text) to anon, authenticated;
grant execute on function public.search_products(text, text, text[], text[], numeric, numeric, boolean, boolean, boolean, text, integer, integer, uuid[]) to anon, authenticated;
grant execute on function public.search_facets(text, text) to anon, authenticated;
grant execute on function public.search_suggestions(text) to anon, authenticated;
