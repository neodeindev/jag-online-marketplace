/** What every dashboard Server Action returns, so forms can show a toast or a field error. */
export type ActionResult<T = undefined> =
  | ({ ok: true; message?: string } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; field?: string };

export function fail(error: unknown, fallback = "Something went wrong. Try again."): { ok: false; error: string } {
  if (error instanceof Error && error.message) return { ok: false, error: friendlyDbError(error.message) };
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return { ok: false, error: friendlyDbError(error.message) };
  }
  return { ok: false, error: fallback };
}

/** Turns common Postgres errors into plain language. */
export function friendlyDbError(message: string): string {
  if (/duplicate key value violates unique constraint "products_sku_key"/.test(message)) {
    return "Another product already uses that SKU.";
  }
  if (/duplicate key value violates unique constraint ".*slug.*"/.test(message)) {
    return "That web address (slug) is already used. Choose a different one.";
  }
  if (/brands_name_unique|attributes_name_unique/.test(message)) return "That name is already used.";
  if (/violates foreign key constraint "categories_parent_id_fkey"/.test(message)) {
    return "This category has sub-categories. Move or delete them first.";
  }
  if (/row-level security|permission denied/i.test(message)) {
    return "You don't have permission to do that. Ask the store owner for access.";
  }
  if (/violates check constraint "products_stock_check"/.test(message)) return "Stock can't be below zero.";
  return message;
}
