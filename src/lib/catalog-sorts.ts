// Sort options shared by the server loaders and the client sort menu.

export type ProductSort =
  | "relevance"
  | "featured"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "best_selling"
  | "rating";

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "best_selling", label: "Best selling" },
  { value: "newest", label: "Newest arrivals" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Customer rating" },
];
