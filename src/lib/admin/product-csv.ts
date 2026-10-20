import Papa from "papaparse";

/**
 * Product CSV format shared by export and import.
 *
 * Columns (header names are case-insensitive on import; any subset is allowed
 * as long as each row can be matched by SKU or has a title and price):
 *   sku, title, description, price, sale_price, stock, brand, category,
 *   status, featured, attributes, specifications, images
 *
 *   category        "Fashion > Women > Dresses" (created if missing)
 *   attributes      "Size: S|M|L; Colour: Black|Red"
 *   specifications  "Material: Cotton; Weight: 200 g"
 *   images          "https://…/1.webp|https://…/2.webp"
 *
 * Text cells that start with =, +, - or @ are exported with a leading
 * apostrophe so spreadsheet apps don't run them as formulas; import strips it.
 *
 * Blank cells leave the product unchanged, except sale_price, brand and
 * category, where a blank cell clears the value. A column that's missing
 * entirely is always left unchanged.
 */

export const CSV_COLUMNS = [
  "sku",
  "title",
  "description",
  "price",
  "sale_price",
  "stock",
  "brand",
  "category",
  "status",
  "featured",
  "attributes",
  "specifications",
  "images",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** Row shape expected by public.admin_import_products(). Omitted keys = unchanged. */
export interface ImportPayload {
  sku?: string;
  title?: string;
  description?: string;
  price?: number;
  sale_price?: number | null;
  stock?: number;
  brand?: string;
  category?: string;
  status?: "active" | "hidden";
  featured?: boolean;
  attributes?: Record<string, string[]>;
  specifications?: { label: string; value: string }[];
  images?: string[];
}

export interface ExportProduct {
  sku: string;
  title: string;
  description: string;
  price: number;
  sale_price: number | null;
  stock: number;
  brand: string | null;
  category: string | null;
  status: "active" | "hidden";
  featured: boolean;
  attributes: Record<string, string[]>;
  specifications: { label: string; value: string }[];
  images: string[];
}

// -----------------------------------------------------------------------------
// Cell formats
// -----------------------------------------------------------------------------

/** "Size: S|M|L; Colour: Black|Red" -> { Size: ["S","M","L"], Colour: ["Black","Red"] } */
export function parseAttributesCell(cell: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const part of cell.split(";")) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const name = part.slice(0, colon).trim();
    if (!name) continue;
    const values = part
      .slice(colon + 1)
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length === 0) continue;
    const existing = result[name] ?? [];
    for (const v of values) if (!existing.some((e) => e.toLowerCase() === v.toLowerCase())) existing.push(v);
    result[name] = existing;
  }
  return result;
}

export function formatAttributesCell(attributes: Record<string, string[]>): string {
  return Object.entries(attributes)
    .filter(([, values]) => values.length > 0)
    .map(([name, values]) => `${name}: ${values.join("|")}`)
    .join("; ");
}

/** "Material: Cotton; Weight: 200 g" -> [{ label: "Material", value: "Cotton" }, ...]. Splits on the first colon only. */
export function parseSpecificationsCell(cell: string): { label: string; value: string }[] {
  const specs: { label: string; value: string }[] = [];
  for (const part of cell.split(";")) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const label = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (label && value) specs.push({ label, value });
  }
  return specs;
}

export function formatSpecificationsCell(specs: { label: string; value: string }[]): string {
  return specs
    .filter((s) => s.label.trim() && s.value.trim())
    .map((s) => `${s.label.trim()}: ${s.value.trim()}`)
    .join("; ");
}

export function parseImagesCell(cell: string): string[] {
  return cell
    .split(/[|\n]/)
    .map((u) => u.trim())
    .filter(Boolean);
}

// -----------------------------------------------------------------------------
// Import
// -----------------------------------------------------------------------------

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "").replace(/^(G\$|GYD|\$)/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}

function parseBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (["true", "yes", "y", "1", "featured"].includes(v)) return true;
  if (["false", "no", "n", "0"].includes(v)) return false;
  return null;
}

/** Undo the leading apostrophe export adds before =, +, -, @, tab or CR (spreadsheet formula guard). */
function unguard(value: string): string {
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
}

/** Normalises header names: " Sale Price " -> "sale_price". */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Turns one CSV row (keyed by normalised header) into an import payload.
 * Validates formats only; whether the SKU already exists is checked separately.
 */
export function rowToImportPayload(row: Record<string, string | undefined>): {
  payload: ImportPayload;
  errors: string[];
} {
  const errors: string[] = [];
  const payload: ImportPayload = {};
  const has = (key: CsvColumn) => Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined;
  const cell = (key: CsvColumn) => unguard((row[key] ?? "").trim());

  if (has("sku") && cell("sku")) {
    const sku = cell("sku");
    if (sku.length > 64) errors.push("SKU is longer than 64 characters.");
    else payload.sku = sku;
  }

  if (has("title") && cell("title")) {
    const title = cell("title");
    if (title.length > 200) errors.push("Title is longer than 200 characters.");
    else payload.title = title;
  }

  if (has("description") && cell("description")) payload.description = cell("description");

  if (has("price") && cell("price")) {
    const price = parseMoney(cell("price"));
    if (price === null) errors.push(`Price “${cell("price")}” isn't a number.`);
    else payload.price = price;
  }

  if (has("sale_price")) {
    if (!cell("sale_price")) {
      payload.sale_price = null;
    } else {
      const sale = parseMoney(cell("sale_price"));
      if (sale === null) errors.push(`Sale price “${cell("sale_price")}” isn't a number.`);
      else payload.sale_price = sale;
    }
  }

  if (payload.price !== undefined && payload.sale_price != null && payload.sale_price >= payload.price) {
    errors.push("Sale price must be lower than the price.");
  }

  if (has("stock") && cell("stock")) {
    const raw = cell("stock").replace(/,/g, "");
    if (!/^\d+$/.test(raw)) errors.push(`Stock “${cell("stock")}” must be a whole number of 0 or more.`);
    else payload.stock = Number(raw);
  }

  if (has("brand")) payload.brand = cell("brand");
  if (has("category")) payload.category = cell("category");

  if (has("status") && cell("status")) {
    const status = cell("status").toLowerCase();
    if (status === "active" || status === "visible" || status === "shown") payload.status = "active";
    else if (status === "hidden" || status === "draft") payload.status = "hidden";
    else errors.push(`Status “${cell("status")}” should be active or hidden.`);
  }

  if (has("featured") && cell("featured")) {
    const featured = parseBool(cell("featured"));
    if (featured === null) errors.push(`Featured “${cell("featured")}” should be yes or no.`);
    else payload.featured = featured;
  }

  if (has("attributes") && cell("attributes")) {
    const attributes = parseAttributesCell(cell("attributes"));
    if (Object.keys(attributes).length === 0) errors.push("Attributes should look like “Size: S|M; Colour: Black”.");
    else payload.attributes = attributes;
  }

  if (has("specifications") && cell("specifications")) {
    const specs = parseSpecificationsCell(cell("specifications"));
    if (specs.length === 0) errors.push("Specifications should look like “Material: Cotton; Weight: 200 g”.");
    else payload.specifications = specs;
  }

  if (has("images") && cell("images")) {
    const urls = parseImagesCell(cell("images"));
    const bad = urls.filter((u) => !/^https?:\/\/\S+$/i.test(u));
    if (bad.length > 0) errors.push(`Image links must start with http:// or https:// (${bad[0]}).`);
    else payload.images = urls;
  }

  return { payload, errors };
}

/** Rows that will create a product need a title and price. */
export function missingForNewProduct(payload: ImportPayload): string[] {
  const missing: string[] = [];
  if (!payload.title) missing.push("Title is required for new products.");
  if (payload.price === undefined) missing.push("Price is required for new products.");
  return missing;
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

/** Stops spreadsheet apps treating text as a formula (CSV injection). */
function guard(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function productsToCsv(rows: ExportProduct[]): string {
  return Papa.unparse(
    {
      fields: [...CSV_COLUMNS],
      data: rows.map((p) => [
        guard(p.sku),
        guard(p.title),
        guard(p.description),
        String(p.price),
        p.sale_price === null ? "" : String(p.sale_price),
        String(p.stock),
        guard(p.brand ?? ""),
        guard(p.category ?? ""),
        p.status,
        p.featured ? "yes" : "no",
        guard(formatAttributesCell(p.attributes)),
        guard(formatSpecificationsCell(p.specifications)),
        p.images.join("|"),
      ]),
    },
    { newline: "\r\n" },
  );
}

export function templateCsv(): string {
  return productsToCsv([
    {
      sku: "TEE-BLK-001",
      title: "Cotton crew-neck T-shirt",
      description: "Soft 100% cotton T-shirt with a relaxed fit.",
      price: 3500,
      sale_price: 2800,
      stock: 24,
      brand: "Island Basics",
      category: "Fashion > Men > T-Shirts",
      status: "active",
      featured: true,
      attributes: { Size: ["S", "M", "L", "XL"], Colour: ["Black", "White"] },
      specifications: [
        { label: "Material", value: "100% cotton" },
        { label: "Care", value: "Machine wash cold" },
      ],
      images: ["https://example.com/images/tee-black-front.jpg", "https://example.com/images/tee-black-back.jpg"],
    },
    {
      sku: "KIT-KETTLE-17",
      title: "1.7 L electric kettle",
      description: "Boils a full kettle in under 4 minutes. Auto shut-off.",
      price: 9800,
      sale_price: null,
      stock: 8,
      brand: "HomeChef",
      category: "Home & Kitchen > Kitchen",
      status: "active",
      featured: false,
      attributes: { Colour: ["Silver"] },
      specifications: [
        { label: "Capacity", value: "1.7 L" },
        { label: "Power", value: "2200 W" },
      ],
      images: [],
    },
  ]);
}
