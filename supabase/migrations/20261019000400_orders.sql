-- =============================================================================
-- Checkout, order tracking and order management.
-- =============================================================================

-- Place an order. Prices, stock, delivery fees and option choices are all
-- validated here from the database, never trusted from the browser.
--
-- p_payload:
-- {
--   "customer": { "name": "...", "email": "...", "phone": "..." },
--   "delivery": { "zone_id": "uuid", "address_line": "...", "city": "...", "notes": "..." },
--   "payment_method": "cash_on_delivery" | "bank_transfer" | "mmg",
--   "items": [ { "product_id": "uuid", "quantity": 2, "options": { "Size": "M" } } ]
-- }
create or replace function public.place_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.store_settings;
  v_zone public.delivery_zones;
  v_name text := nullif(trim(p_payload -> 'customer' ->> 'name'), '');
  v_email text := nullif(lower(trim(p_payload -> 'customer' ->> 'email')), '');
  v_phone text := nullif(trim(p_payload -> 'customer' ->> 'phone'), '');
  v_address text := nullif(trim(p_payload -> 'delivery' ->> 'address_line'), '');
  v_city text := nullif(trim(p_payload -> 'delivery' ->> 'city'), '');
  v_notes text := nullif(trim(p_payload -> 'delivery' ->> 'notes'), '');
  v_method public.payment_method;
  v_items jsonb := coalesce(p_payload -> 'items', '[]'::jsonb);
  v_line jsonb;
  v_product record;
  v_option record;
  v_choice text;
  v_qty integer;
  v_price numeric;
  v_subtotal numeric := 0;
  v_count integer := 0;
  v_fee numeric := 0;
  v_order_id uuid;
  v_order_number text;
  v_token uuid;
  v_image text;
begin
  select * into v_settings from public.store_settings where id = 1;

  -- Customer details
  if v_name is null or length(v_name) < 2 then
    raise exception 'Enter your full name.';
  end if;
  if v_phone is null or length(regexp_replace(v_phone, '\D', '', 'g')) < 7 then
    raise exception 'Enter a phone number we can reach you on.';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Check the email address — it doesn''t look complete.';
  end if;

  -- Basic protection against repeated submissions holding stock.
  if (
    select count(*) from public.orders
    where customer_phone = v_phone and created_at > now() - interval '1 hour' and status = 'pending'
  ) >= 5 then
    raise exception 'You''ve placed several orders in the last hour. Please contact us to place another.';
  end if;

  -- Payment method
  begin
    v_method := (p_payload ->> 'payment_method')::public.payment_method;
  exception when others then
    raise exception 'Choose how you''d like to pay.';
  end;
  if v_method is null
    or (v_method = 'cash_on_delivery' and not v_settings.cash_on_delivery_enabled)
    or (v_method = 'bank_transfer' and not v_settings.bank_transfer_enabled)
    or (v_method = 'mmg' and not v_settings.mmg_enabled) then
    raise exception 'That payment method isn''t available. Choose another.';
  end if;

  -- Delivery
  select * into v_zone from public.delivery_zones
  where id = nullif(p_payload -> 'delivery' ->> 'zone_id', '')::uuid and is_active;
  if v_zone.id is null then
    raise exception 'Choose a delivery area.';
  end if;
  if not v_zone.is_pickup and v_address is null then
    raise exception 'Enter a delivery address.';
  end if;
  if v_method = 'cash_on_delivery' and v_zone.is_pickup then
    -- Paying cash at pickup is the same flow; allowed.
    null;
  end if;

  -- Items
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;
  if jsonb_array_length(v_items) > 50 then
    raise exception 'Orders can include up to 50 different items.';
  end if;

  -- Lock every product in a stable order, then check total quantity per product.
  for v_product in
    select p.id, p.title, p.stock, p.status, w.wanted
    from (
      select (l ->> 'product_id')::uuid as product_id, sum((l ->> 'quantity')::int) as wanted
      from jsonb_array_elements(v_items) l
      group by 1
    ) w
    join public.products p on p.id = w.product_id
    order by p.id
    for update of p
  loop
    if v_product.status <> 'active' then
      raise exception '"%" is no longer available. Remove it from your cart to continue.', v_product.title;
    end if;
    if v_product.wanted > v_product.stock then
      if v_product.stock = 0 then
        raise exception '"%" just sold out. Remove it from your cart to continue.', v_product.title;
      else
        raise exception 'Only % of "%" left. Lower the quantity to continue.', v_product.stock, v_product.title;
      end if;
    end if;
  end loop;

  v_order_number := v_settings.order_prefix || '-' || nextval('public.order_number_seq');

  insert into public.orders (
    order_number, user_id, payment_method, customer_name, customer_email, customer_phone,
    address_line, city, delivery_zone_id, delivery_zone_name, is_pickup, delivery_notes,
    subtotal, delivery_fee, total, item_count
  ) values (
    v_order_number, auth.uid(), v_method, v_name, v_email, v_phone,
    v_address, v_city, v_zone.id, v_zone.name, v_zone.is_pickup, v_notes,
    0, 0, 0, 0
  )
  returning id, access_token into v_order_id, v_token;

  for v_line in select * from jsonb_array_elements(v_items)
  loop
    begin
      v_qty := (v_line ->> 'quantity')::int;
    exception when others then
      v_qty := null;
    end;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'Each item quantity must be between 1 and 99.';
    end if;

    select p.* into v_product from public.products p where p.id = (v_line ->> 'product_id')::uuid;
    if v_product.id is null then
      raise exception 'An item in your cart is no longer available. Refresh your cart to continue.';
    end if;

    -- Every option attribute (e.g. Size) on the product needs a valid choice.
    for v_option in
      select a.name, array_agg(av.value) as allowed
      from public.product_attribute_values pav
      join public.attribute_values av on av.id = pav.attribute_value_id
      join public.attributes a on a.id = av.attribute_id
      where pav.product_id = v_product.id and a.is_option
      group by a.name
    loop
      v_choice := v_line -> 'options' ->> v_option.name;
      if v_choice is null or not (v_choice = any (v_option.allowed)) then
        raise exception 'Choose a % for "%".', lower(v_option.name), v_product.title;
      end if;
    end loop;

    v_price := public.price_now(v_product.price, v_product.sale_price, v_product.sale_ends_at);
    select i.url into v_image from public.product_images i
    where i.product_id = v_product.id order by i.sort_order, i.created_at limit 1;

    insert into public.order_items (order_id, product_id, title, sku, image_url, options, unit_price, quantity, line_total)
    values (
      v_order_id, v_product.id, v_product.title, v_product.sku, v_image,
      coalesce((
        select jsonb_object_agg(key, value)
        from jsonb_each(coalesce(v_line -> 'options', '{}'::jsonb))
        where key in (
          select a.name from public.product_attribute_values pav
          join public.attribute_values av on av.id = pav.attribute_value_id
          join public.attributes a on a.id = av.attribute_id
          where pav.product_id = v_product.id and a.is_option
        )
      ), '{}'::jsonb),
      v_price, v_qty, v_price * v_qty
    );

    update public.products
    set stock = stock - v_qty, sold_count = sold_count + v_qty
    where id = v_product.id;

    v_subtotal := v_subtotal + v_price * v_qty;
    v_count := v_count + v_qty;
  end loop;

  if v_zone.is_pickup then
    v_fee := 0;
  elsif v_settings.free_delivery_threshold is not null and v_subtotal >= v_settings.free_delivery_threshold then
    v_fee := 0;
  else
    v_fee := v_zone.fee;
  end if;

  update public.orders
  set subtotal = v_subtotal, delivery_fee = v_fee, total = v_subtotal + v_fee, item_count = v_count
  where id = v_order_id;

  insert into public.order_events (order_id, status, note, actor_id)
  values (v_order_id, 'pending', 'Order placed', auth.uid());

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'access_token', v_token,
    'total', v_subtotal + v_fee
  );
end;
$$;

-- Order details as JSON for the confirmation page, account page and emails.
create or replace function public.order_json(p_order_id uuid, p_include_private boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'access_token', case when p_include_private then o.access_token end,
    'status', o.status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'customer_name', o.customer_name,
    'customer_email', case when p_include_private then o.customer_email end,
    'customer_phone', case when p_include_private then o.customer_phone end,
    'address_line', case when p_include_private then o.address_line end,
    'city', o.city,
    'delivery_zone_name', o.delivery_zone_name,
    'is_pickup', o.is_pickup,
    'delivery_notes', case when p_include_private then o.delivery_notes end,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'item_count', o.item_count,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', i.title,
        'sku', i.sku,
        'image_url', i.image_url,
        'options', i.options,
        'unit_price', i.unit_price,
        'quantity', i.quantity,
        'line_total', i.line_total,
        'product_slug', (select p.slug from public.products p where p.id = i.product_id and p.status = 'active')
      ) order by i.title)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object('status', e.status, 'created_at', e.created_at) order by e.created_at)
      from public.order_events e where e.order_id = o.id and e.status is not null
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$$;

revoke execute on function public.order_json(uuid, boolean) from public, anon, authenticated;

-- Confirmation page: the link from checkout carries the order's access token.
-- Signed-in owners of the order and order staff can open it without the token.
create or replace function public.get_order(p_order_number text, p_access_token uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where order_number = upper(trim(p_order_number));
  if v_order.id is null then
    return null;
  end if;
  if v_order.access_token = p_access_token
    or (v_order.user_id is not null and v_order.user_id = auth.uid())
    or public.has_permission('orders') then
    return public.order_json(v_order.id, true);
  end if;
  return null;
end;
$$;

-- Track an order with its number plus the email or phone used at checkout.
-- Returns a limited view without contact or address details.
create or replace function public.track_order(p_order_number text, p_contact text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_contact text := lower(trim(coalesce(p_contact, '')));
  v_digits text := regexp_replace(coalesce(p_contact, ''), '\D', '', 'g');
begin
  if v_contact = '' then
    return null;
  end if;

  select * into v_order from public.orders where order_number = upper(trim(p_order_number));
  if v_order.id is null then
    return null;
  end if;

  if (v_order.customer_email is not null and lower(v_order.customer_email) = v_contact)
    or (length(v_digits) >= 7 and right(regexp_replace(v_order.customer_phone, '\D', '', 'g'), 7) = right(v_digits, 7)) then
    return public.order_json(v_order.id, false);
  end if;
  return null;
end;
$$;

-- Staff: change status and/or payment status, with an optional note.
-- Cancelling returns the items to stock. Cancelled orders can't be reopened.
create or replace function public.admin_update_order(
  p_order_id uuid,
  p_status public.order_status default null,
  p_payment_status public.payment_status default null,
  p_note text default null,
  p_customer_notified boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_status_changed boolean;
begin
  if not public.has_permission('orders') then
    raise exception 'You don''t have permission to manage orders.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  v_status_changed := p_status is not null and p_status <> v_order.status;

  if v_status_changed and v_order.status = 'cancelled' then
    raise exception 'This order was cancelled and can''t be reopened. Ask the customer to place a new order.';
  end if;

  if v_status_changed and p_status = 'cancelled' then
    update public.products p
    set stock = p.stock + i.quantity,
        sold_count = greatest(0, p.sold_count - i.quantity)
    from (
      select product_id, sum(quantity) as quantity
      from public.order_items
      where order_id = v_order.id and product_id is not null
      group by product_id
    ) i
    where p.id = i.product_id;
  end if;

  update public.orders
  set status = coalesce(p_status, status),
      payment_status = coalesce(p_payment_status, payment_status)
  where id = v_order.id;

  if v_status_changed or v_note is not null
    or (p_payment_status is not null and p_payment_status <> v_order.payment_status) then
    insert into public.order_events (order_id, status, note, actor_id, customer_notified)
    values (
      v_order.id,
      case when v_status_changed then p_status end,
      coalesce(
        v_note,
        case when p_payment_status is not null and p_payment_status <> v_order.payment_status
          then 'Payment marked ' || replace(p_payment_status::text, '_', ' ') end
      ),
      auth.uid(),
      coalesce(p_customer_notified, false)
    );
  end if;

  return public.order_json(v_order.id, true);
end;
$$;

-- Customers: write or update a review. It goes to the moderation queue.
create or replace function public.submit_review(
  p_product_id uuid,
  p_rating integer,
  p_title text default null,
  p_body text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
  v_verified boolean;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Sign in to write a review.';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Choose a rating from 1 to 5 stars.';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and status = 'active') then
    raise exception 'This product is no longer available.';
  end if;

  select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Customer')
  into v_name from public.profiles where id = v_user;

  select exists (
    select 1 from public.orders o
    join public.order_items i on i.order_id = o.id
    where o.user_id = v_user and i.product_id = p_product_id and o.status = 'delivered'
  ) into v_verified;

  insert into public.reviews (product_id, user_id, author_name, rating, title, body, is_verified_purchase, status)
  values (
    p_product_id, v_user, coalesce(v_name, 'Customer'), p_rating,
    nullif(left(trim(coalesce(p_title, '')), 120), ''),
    nullif(left(trim(coalesce(p_body, '')), 2000), ''),
    coalesce(v_verified, false), 'pending'
  )
  on conflict (product_id, user_id) do update
  set rating = excluded.rating,
      title = excluded.title,
      body = excluded.body,
      is_verified_purchase = excluded.is_verified_purchase,
      status = 'pending'
  returning id into v_id;

  return v_id;
end;
$$;

-- Owner: give an existing account staff access, change it, or remove it.
create or replace function public.owner_set_access(
  p_user_id uuid,
  p_role public.user_role,
  p_permissions text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed text[] := array['products', 'orders', 'content', 'customers'];
begin
  if not public.is_owner() then
    raise exception 'Only the store owner can change staff access.';
  end if;
  if p_user_id = auth.uid() and p_role <> 'owner' then
    raise exception 'You can''t remove your own owner access.';
  end if;
  if exists (select 1 from unnest(coalesce(p_permissions, '{}')) perm where not perm = any (v_allowed)) then
    raise exception 'Unknown permission.';
  end if;

  update public.profiles
  set role = p_role,
      permissions = case when p_role = 'staff' then coalesce(p_permissions, '{}') else '{}' end
  where id = p_user_id;

  if not found then
    raise exception 'Account not found.';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin reporting
-- -----------------------------------------------------------------------------
create or replace function public.admin_dashboard(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz text;
  v_low integer;
  v_today date;
  v_days integer := greatest(7, least(coalesce(p_days, 30), 365));
begin
  if not public.is_staff() then
    raise exception 'Staff access required.';
  end if;

  select timezone, low_stock_threshold into v_tz, v_low from public.store_settings where id = 1;
  v_today := (now() at time zone v_tz)::date;

  return jsonb_build_object(
    'today', (
      select jsonb_build_object('orders', count(*), 'revenue', coalesce(sum(total), 0))
      from public.orders
      where status <> 'cancelled' and (created_at at time zone v_tz)::date = v_today
    ),
    'period', (
      select jsonb_build_object('orders', count(*), 'revenue', coalesce(sum(total), 0), 'average', coalesce(round(avg(total), 2), 0))
      from public.orders
      where status <> 'cancelled' and (created_at at time zone v_tz)::date > v_today - v_days
    ),
    'previous_period', (
      select jsonb_build_object('orders', count(*), 'revenue', coalesce(sum(total), 0))
      from public.orders
      where status <> 'cancelled'
        and (created_at at time zone v_tz)::date > v_today - 2 * v_days
        and (created_at at time zone v_tz)::date <= v_today - v_days
    ),
    'pending_orders', (select count(*) from public.orders where status = 'pending'),
    'unpaid_orders', (
      select count(*) from public.orders
      where payment_status = 'unpaid' and status not in ('cancelled', 'pending')
    ),
    'products', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where status = 'active'),
        'out_of_stock', count(*) filter (where status = 'active' and stock = 0),
        'low_stock', count(*) filter (where status = 'active' and stock > 0 and stock <= v_low)
      )
      from public.products
    ),
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'daily', (
      select jsonb_agg(jsonb_build_object('day', d.day::date, 'orders', coalesce(o.orders, 0), 'revenue', coalesce(o.revenue, 0)) order by d.day)
      from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as d(day)
      left join (
        select (created_at at time zone v_tz)::date as day, count(*) as orders, sum(total) as revenue
        from public.orders
        where status <> 'cancelled' and (created_at at time zone v_tz)::date > v_today - v_days
        group by 1
      ) o on o.day = d.day::date
    ),
    'top_products', coalesce((
      select jsonb_agg(t order by t.quantity desc)
      from (
        select i.title, sum(i.quantity) as quantity, sum(i.line_total) as revenue
        from public.order_items i
        join public.orders o on o.id = i.order_id
        where o.status <> 'cancelled' and (o.created_at at time zone v_tz)::date > v_today - v_days
        group by i.title
        order by sum(i.quantity) desc
        limit 5
      ) t
    ), '[]'::jsonb),
    'low_stock_items', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'sku', sku, 'stock', stock) order by stock, title)
      from (
        select id, title, sku, stock from public.products
        where status = 'active' and stock <= v_low
        order by stock, title
        limit 8
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

-- Registered customers with order totals.
create or replace function public.admin_customers(
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  created_at timestamptz,
  order_count bigint,
  total_spent numeric,
  last_order_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.has_permission('customers') or public.has_permission('orders')) then
    raise exception 'You don''t have permission to view customers.';
  end if;

  return query
    select pr.id, pr.email, pr.full_name, pr.phone, pr.created_at,
      count(o.id) filter (where o.status <> 'cancelled'),
      coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0),
      max(o.created_at),
      count(*) over ()
    from public.profiles pr
    left join public.orders o on o.user_id = pr.id
    where pr.role = 'customer'
      and (
        p_search is null or p_search = ''
        or pr.email ilike '%' || p_search || '%'
        or pr.full_name ilike '%' || p_search || '%'
        or pr.phone ilike '%' || p_search || '%'
      )
    group by pr.id
    order by pr.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200))
    offset greatest(0, coalesce(p_offset, 0));
end;
$$;

grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.get_order(text, uuid) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.admin_update_order(uuid, public.order_status, public.payment_status, text, boolean) to authenticated;
grant execute on function public.submit_review(uuid, integer, text, text) to authenticated;
grant execute on function public.owner_set_access(uuid, public.user_role, text[]) to authenticated;
grant execute on function public.admin_dashboard(integer) to authenticated;
grant execute on function public.admin_customers(text, integer, integer) to authenticated;

revoke execute on function public.admin_update_order(uuid, public.order_status, public.payment_status, text, boolean) from public, anon;
revoke execute on function public.submit_review(uuid, integer, text, text) from public, anon;
revoke execute on function public.owner_set_access(uuid, public.user_role, text[]) from public, anon;
revoke execute on function public.admin_dashboard(integer) from public, anon;
revoke execute on function public.admin_customers(text, integer, integer) from public, anon;
