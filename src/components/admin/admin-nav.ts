import type { StaffPermission } from "@/lib/types";

export interface AdminNavItem {
  href: string;
  label: string;
  icon:
    | "overview"
    | "orders"
    | "products"
    | "categories"
    | "brands"
    | "attributes"
    | "import"
    | "reviews"
    | "banners"
    | "pages"
    | "customers"
    | "delivery"
    | "staff"
    | "settings";
  permission: StaffPermission | "owner" | null;
}

export const ADMIN_NAV: { title: string | null; items: AdminNavItem[] }[] = [
  {
    title: null,
    items: [
      { href: "/admin", label: "Overview", icon: "overview", permission: null },
      { href: "/admin/orders", label: "Orders", icon: "orders", permission: "orders" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: "products", permission: "products" },
      { href: "/admin/categories", label: "Categories", icon: "categories", permission: "products" },
      { href: "/admin/brands", label: "Brands", icon: "brands", permission: "products" },
      { href: "/admin/attributes", label: "Sizes, colours & filters", icon: "attributes", permission: "products" },
      { href: "/admin/products/import", label: "Import / export", icon: "import", permission: "products" },
      { href: "/admin/reviews", label: "Reviews", icon: "reviews", permission: "products" },
    ],
  },
  {
    title: "Storefront",
    items: [
      { href: "/admin/banners", label: "Homepage banners", icon: "banners", permission: "content" },
      { href: "/admin/pages", label: "Policy pages", icon: "pages", permission: "content" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/customers", label: "Customers", icon: "customers", permission: "customers" },
      { href: "/admin/staff", label: "Staff accounts", icon: "staff", permission: "owner" },
    ],
  },
  {
    title: "Store",
    items: [
      { href: "/admin/delivery", label: "Delivery areas", icon: "delivery", permission: "owner" },
      { href: "/admin/settings", label: "Settings", icon: "settings", permission: "owner" },
    ],
  },
];

export const PERMISSION_LABELS: Record<StaffPermission, { label: string; description: string }> = {
  orders: { label: "Orders", description: "View orders, update status and payment" },
  products: { label: "Products & catalog", description: "Products, categories, brands, import/export, reviews" },
  content: { label: "Storefront content", description: "Homepage banners and policy pages" },
  customers: { label: "Customers", description: "View customer accounts and contact details" },
};
