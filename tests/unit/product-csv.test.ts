import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import {
  formatAttributesCell,
  formatSpecificationsCell,
  missingForNewProduct,
  normalizeHeader,
  parseAttributesCell,
  parseSpecificationsCell,
  productsToCsv,
  rowToImportPayload,
  templateCsv,
  type ExportProduct,
} from "@/lib/admin/product-csv";

function parseCsv(csv: string) {
  return Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true, transformHeader: normalizeHeader }).data;
}

describe("attribute cells", () => {
  it("parses groups and values, ignoring blanks and duplicates", () => {
    expect(parseAttributesCell("Size: S|M| m |L; Colour: Black|Red;;Bad")).toEqual({
      Size: ["S", "M", "L"],
      Colour: ["Black", "Red"],
    });
  });

  it("round-trips", () => {
    const attrs = { Size: ["S", "M"], Colour: ["Navy"] };
    expect(parseAttributesCell(formatAttributesCell(attrs))).toEqual(attrs);
  });
});

describe("specification cells", () => {
  it("splits on the first colon only", () => {
    expect(parseSpecificationsCell("Ratio: 16:9; Material: Cotton")).toEqual([
      { label: "Ratio", value: "16:9" },
      { label: "Material", value: "Cotton" },
    ]);
  });

  it("round-trips", () => {
    const specs = [{ label: "Weight", value: "200 g" }];
    expect(parseSpecificationsCell(formatSpecificationsCell(specs))).toEqual(specs);
  });
});

describe("rowToImportPayload", () => {
  it("accepts money with symbols and thousands separators", () => {
    const { payload, errors } = rowToImportPayload({ title: "Kettle", price: "G$ 9,800", stock: "1,200" });
    expect(errors).toEqual([]);
    expect(payload).toMatchObject({ title: "Kettle", price: 9800, stock: 1200 });
  });

  it("treats blank sale price, brand and category as 'clear', other blanks as 'unchanged'", () => {
    const { payload } = rowToImportPayload({ sku: "A1", title: "", sale_price: "", brand: "", category: "", stock: "" });
    expect(payload).toEqual({ sku: "A1", sale_price: null, brand: "", category: "" });
  });

  it("leaves missing columns out entirely", () => {
    expect(rowToImportPayload({ sku: "A1", stock: "3" }).payload).toEqual({ sku: "A1", stock: 3 });
  });

  it("reports readable errors for bad values", () => {
    const { errors } = rowToImportPayload({
      price: "ten",
      stock: "-1",
      status: "maybe",
      featured: "perhaps",
      images: "ftp://x/1.jpg",
    });
    expect(errors).toHaveLength(5);
    expect(errors[0]).toMatch(/Price “ten” isn't a number/);
  });

  it("rejects a sale price that isn't lower than the price", () => {
    expect(rowToImportPayload({ price: "1000", sale_price: "1000" }).errors).toContain(
      "Sale price must be lower than the price.",
    );
  });

  it("maps status synonyms and yes/no", () => {
    expect(rowToImportPayload({ status: "Draft", featured: "Yes" }).payload).toEqual({ status: "hidden", featured: true });
  });

  it("requires a title and price for new products", () => {
    expect(missingForNewProduct({ sku: "X" })).toHaveLength(2);
    expect(missingForNewProduct({ title: "T", price: 1 })).toEqual([]);
  });
});

describe("export and the template", () => {
  const product: ExportProduct = {
    sku: "=HYPERLINK(\"http://evil\")",
    title: "-10% off, \"quoted\" title",
    description: "- First line\n- Second line",
    price: 2500,
    sale_price: null,
    stock: 4,
    brand: "@brand",
    category: "Home & kitchen > Kitchen",
    status: "hidden",
    featured: false,
    attributes: { Colour: ["Red"] },
    specifications: [{ label: "Size", value: "Large" }],
    images: ["https://cdn.example.com/a.webp", "https://cdn.example.com/b.webp"],
  };

  it("guards cells that spreadsheets would run as formulas", () => {
    const [row] = parseCsv(productsToCsv([product]));
    expect(row.sku.startsWith("'=")).toBe(true);
    expect(row.title.startsWith("'-")).toBe(true);
    expect(row.brand).toBe("'@brand");
  });

  it("imports its own export back unchanged", () => {
    const [row] = parseCsv(productsToCsv([product]));
    const { payload, errors } = rowToImportPayload(row);
    expect(errors).toEqual([]);
    expect(payload).toEqual({
      sku: product.sku,
      title: product.title,
      description: product.description,
      price: 2500,
      sale_price: null,
      stock: 4,
      brand: "@brand",
      category: "Home & kitchen > Kitchen",
      status: "hidden",
      featured: false,
      attributes: { Colour: ["Red"] },
      specifications: [{ label: "Size", value: "Large" }],
      images: product.images,
    });
  });

  it("ships a template whose rows all import cleanly", () => {
    const rows = parseCsv(templateCsv());
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      const { payload, errors } = rowToImportPayload(row);
      expect(errors).toEqual([]);
      expect(missingForNewProduct(payload)).toEqual([]);
    }
  });
});
