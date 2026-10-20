// Shapes shared between server data loaders and UI components.

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cash_on_delivery" | "bank_transfer" | "mmg";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type ProductStatus = "active" | "hidden";
export type UserRole = "customer" | "staff" | "owner";
export type StaffPermission = "products" | "orders" | "content" | "customers";

export interface StoreSettings {
  store_name: string;
  tagline: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  address: string | null;
  business_hours: string | null;
  currency_code: string;
  currency_symbol: string;
  timezone: string;
  order_prefix: string;
  order_notification_emails: string[];
  free_delivery_threshold: number | null;
  low_stock_threshold: number;
  cash_on_delivery_enabled: boolean;
  bank_transfer_enabled: boolean;
  mmg_enabled: boolean;
  bank_transfer_instructions: string | null;
  mmg_instructions: string | null;
  announcement: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export interface ColorSwatch {
  name: string;
  hex: string | null;
}

/** A product as shown in grids, rails and search results. */
export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  brand_name: string | null;
  price: number;
  current_price: number;
  sale_ends_at: string | null;
  stock: number;
  image_url: string | null;
  hover_image_url: string | null;
  rating_avg: number;
  rating_count: number;
  colors: ColorSwatch[];
  has_options: boolean;
}

export interface SearchResult {
  products: ProductCardData[];
  total: number;
  isFuzzy: boolean;
  page: number;
  pageSize: number;
}

export interface FacetOption {
  slug: string;
  name: string;
  count: number;
}

export interface AttributeFacet {
  slug: string;
  name: string;
  kind: "select" | "color";
  values: { slug: string; value: string; hex: string | null; count: number }[];
}

export interface Facets {
  total: number;
  in_stock: number;
  on_sale: number;
  price: { min: number | null; max: number | null };
  categories: FacetOption[];
  brands: FacetOption[];
  attributes: AttributeFacet[];
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface ProductOptionGroup {
  name: string;
  slug: string;
  kind: "select" | "color";
  values: { value: string; hex: string | null }[];
}

export interface ProductDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  sku: string;
  price: number;
  sale_price: number | null;
  sale_ends_at: string | null;
  current_price: number;
  stock: number;
  status: ProductStatus;
  rating_avg: number;
  rating_count: number;
  specifications: { label: string; value: string }[];
  brand: { name: string; slug: string } | null;
  category: { id: string; name: string; slug: string } | null;
  breadcrumbs: { name: string; slug: string }[];
  images: ProductImage[];
  options: ProductOptionGroup[];
  /** Non-option attributes, shown with the specifications. */
  details: { name: string; values: string[] }[];
  updated_at: string;
}

export interface Review {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  link_url: string | null;
  image_url: string;
  placement: "hero" | "promo";
  layout: "split" | "cover";
  theme: "forest" | "gold" | "red" | "mist" | "ink";
}

export interface DeliveryZone {
  id: string;
  name: string;
  description: string | null;
  fee: number;
  estimated_days: string | null;
  is_pickup: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface PageSummary {
  slug: string;
  title: string;
}

export interface OrderItemView {
  title: string;
  sku: string | null;
  image_url: string | null;
  options: Record<string, string>;
  unit_price: number;
  quantity: number;
  line_total: number;
  product_slug: string | null;
}

export interface OrderView {
  id: string;
  order_number: string;
  access_token: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  address_line: string | null;
  city: string | null;
  delivery_zone_name: string;
  is_pickup: boolean;
  delivery_notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  item_count: number;
  created_at: string;
  items: OrderItemView[];
  timeline: { status: OrderStatus; created_at: string }[];
}
