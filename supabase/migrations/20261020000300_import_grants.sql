-- =============================================================================
-- CSV import helpers: explicit execute grants.
--
-- admin_import_products() runs with the importing staff member's permissions
-- and calls these helpers, so signed-in users need to be able to execute them.
-- Older Supabase projects granted this by default; newer ones don't. Row level
-- security still limits the writes to staff with the products permission.
-- =============================================================================

grant execute on function public.find_or_create_category_path(text) to authenticated;
grant execute on function public.find_or_create_brand(text) to authenticated;
grant execute on function public.find_or_create_attribute_value(text, text) to authenticated;
grant execute on function public.sync_product_image_urls(uuid, text[]) to authenticated;
