/** Helpers for showing nested categories in dashboard lists and pickers. Pure, usable anywhere. */

export interface CategoryLike {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
}

export interface FlatCategory<T extends CategoryLike> {
  category: T;
  depth: number;
  /** "Fashion › Women › Dresses" */
  path: string;
}

/** Depth-first list (parents before children, siblings by sort order then name). */
export function flattenCategories<T extends CategoryLike>(categories: T[]): FlatCategory<T>[] {
  const children = new Map<string | null, T[]>();
  const ids = new Set(categories.map((c) => c.id));
  for (const c of categories) {
    const parent = c.parent_id && ids.has(c.parent_id) ? c.parent_id : null;
    const list = children.get(parent) ?? [];
    list.push(c);
    children.set(parent, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }

  const out: FlatCategory<T>[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number, prefix: string) => {
    for (const c of children.get(parent) ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      const path = prefix ? `${prefix} › ${c.name}` : c.name;
      out.push({ category: c, depth, path });
      walk(c.id, depth + 1, path);
    }
  };
  walk(null, 0, "");
  return out;
}

/** The category and every category below it. */
export function subtreeIds<T extends CategoryLike>(categories: T[], rootId: string): string[] {
  const result = [rootId];
  for (let i = 0; i < result.length; i++) {
    for (const c of categories) if (c.parent_id === result[i] && !result.includes(c.id)) result.push(c.id);
  }
  return result;
}

/**
 * The rows of a flattened tree that show when only the categories in `open`
 * are expanded: a row shows when every category above it is open.
 */
export function visibleRows<T extends CategoryLike>(rows: FlatCategory<T>[], open: ReadonlySet<string>): FlatCategory<T>[] {
  const out: FlatCategory<T>[] = [];
  // Rows come parents-first, so a closed row hides the deeper rows that follow it.
  let hideBelow = Infinity;
  for (const row of rows) {
    if (row.depth > hideBelow) continue;
    out.push(row);
    hideBelow = open.has(row.category.id) ? Infinity : row.depth;
  }
  return out;
}

/** The categories above this one, nearest first. */
export function ancestorIds<T extends CategoryLike>(categories: T[], id: string): string[] {
  const parentOf = new Map(categories.map((c) => [c.id, c.parent_id]));
  const result: string[] = [];
  for (let p = parentOf.get(id) ?? null; p && parentOf.has(p) && !result.includes(p); p = parentOf.get(p) ?? null) {
    result.push(p);
  }
  return result;
}

/** Path labels by id, for showing a product's category. */
export function categoryPathMap<T extends CategoryLike>(categories: T[], separator = " › "): Map<string, string> {
  const map = new Map<string, string>();
  for (const { category, path } of flattenCategories(categories)) {
    map.set(category.id, separator === " › " ? path : path.split(" › ").join(separator));
  }
  return map;
}
