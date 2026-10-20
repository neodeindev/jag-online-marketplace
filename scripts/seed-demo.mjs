#!/usr/bin/env node
/**
 * Fills a fresh development database with a realistic demo store:
 * ~180 products with photos (from the DummyJSON test catalog, re-hosted in
 * your Supabase Storage), nested categories, brands, sizes and colours,
 * deals, reviews, homepage banners, demo accounts and sample orders.
 *
 *   npm run db:reset      # local stack: start from an empty database
 *   npm run seed:demo     # add -- --allow-remote for a Supabase cloud dev project
 *
 * If a run is interrupted, run it again with --resume: it reuses what was
 * already created and fills in the rest.
 *
 * Demo accounts (local development only — change or delete before launch):
 *   owner     SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD   (default owner@jagmarket.test)
 *   staff     staff@jagmarket.test   (orders + products)
 *   customers ann@jagmarket.test, devon@jagmarket.test, priya@jagmarket.test,
 *             marcus@jagmarket.test, shanice@jagmarket.test
 * All demo accounts use DEMO_PASSWORD below unless SEED_OWNER_PASSWORD is set for the owner.
 */
import { createClient } from "@supabase/supabase-js";

const DEMO_PASSWORD = "JagDemo-2026!";
const SOURCE = "https://dummyjson.com/products?limit=0";
const USD_TO_GYD = 210;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !secret || !publishable) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env");
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(url) && !process.argv.includes("--allow-remote")) {
  console.error(`Refusing to seed demo data into ${url}. Pass --allow-remote if you really mean it.`);
  process.exit(1);
}

const RETRY_STATUSES = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530]);

/** Retries requests that fail before reaching the database (network blips, gateway errors). */
async function fetchWithRetry(input, init) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(input, init);
      if (!RETRY_STATUSES.has(res.status) || attempt === 4) return res;
    } catch (error) {
      if (attempt === 4) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchWithRetry } };
const admin = createClient(url, secret, clientOptions);
const ownerEmail = process.env.SEED_OWNER_EMAIL || "owner@jagmarket.test";
const ownerPassword = process.env.SEED_OWNER_PASSWORD || DEMO_PASSWORD;

// Deterministic randomness so every reset produces the same store.
let seed = 20261019;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const sample = (list, n) => [...list].sort(() => rand() - 0.5).slice(0, n);

const slugify = (text) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/'/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function must(result, what) {
  if (result.error) {
    console.error(`✖ ${what}: ${result.error.message.slice(0, 300)}`);
    process.exit(1);
  }
  return result.data;
}

/** Friendly Guyana-dollar prices: G$2,100 rather than G$2,098. */
function gyd(usd) {
  const raw = usd * USD_TO_GYD;
  const step = raw < 2000 ? 50 : raw < 20000 ? 100 : raw < 100000 ? 500 : 1000;
  return Math.max(step, Math.round(raw / step) * step);
}

async function pool(items, size, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}

// -----------------------------------------------------------------------------
const CATEGORY_MAP = {
  smartphones: ["Electronics", "Phones"],
  tablets: ["Electronics", "Tablets"],
  laptops: ["Electronics", "Laptops"],
  "mobile-accessories": ["Electronics", "Phone accessories"],
  "womens-dresses": ["Fashion", "Women", "Dresses"],
  tops: ["Fashion", "Women", "Tops"],
  "womens-shoes": ["Fashion", "Women", "Shoes"],
  "womens-bags": ["Fashion", "Women", "Bags"],
  "womens-jewellery": ["Fashion", "Women", "Jewellery"],
  "womens-watches": ["Fashion", "Women", "Watches"],
  "mens-shirts": ["Fashion", "Men", "Shirts"],
  "mens-shoes": ["Fashion", "Men", "Shoes"],
  "mens-watches": ["Fashion", "Men", "Watches"],
  sunglasses: ["Fashion", "Sunglasses"],
  beauty: ["Beauty & health", "Makeup"],
  fragrances: ["Beauty & health", "Fragrances"],
  "skin-care": ["Beauty & health", "Skin care"],
  furniture: ["Home & kitchen", "Furniture"],
  "home-decoration": ["Home & kitchen", "Home decor"],
  "kitchen-accessories": ["Home & kitchen", "Kitchen"],
  groceries: ["Groceries"],
  "sports-accessories": ["Sports & outdoors"],
};
const ROOT_ORDER = ["Electronics", "Fashion", "Beauty & health", "Home & kitchen", "Groceries", "Sports & outdoors"];
const FEATURED_CATEGORIES = new Set([
  "Phones",
  "Laptops",
  "Phone accessories",
  "Dresses",
  "Fashion › Women › Shoes",
  "Fashion › Men › Watches",
  "Sunglasses",
  "Makeup",
  "Fragrances",
  "Furniture",
  "Kitchen",
  "Groceries",
  "Sports & outdoors",
]);
const CLOTHING = new Set(["womens-dresses", "tops", "mens-shirts"]);
const SHOES = new Set(["womens-shoes", "mens-shoes"]);
const COLOUR_WORDS = {
  black: "Black", white: "White", grey: "Grey", gray: "Grey", beige: "Beige", brown: "Brown", red: "Red",
  pink: "Pink", orange: "Orange", yellow: "Yellow", green: "Green", blue: "Blue", navy: "Navy",
  purple: "Purple", gold: "Gold", silver: "Silver",
};
const REVIEW_TITLES = { 5: "Love it", 4: "Very good", 3: "It's okay", 2: "Not great", 1: "Disappointed" };

// -----------------------------------------------------------------------------
async function ensureUser(email, password, fullName, phone) {
  const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (profile) return profile.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });
  if (error) throw new Error(`Couldn't create ${email}: ${error.message}`);
  return data.user.id;
}

async function main() {
  const resume = process.argv.includes("--resume");
  const { count } = await admin.from("products").select("id", { count: "exact", head: true });
  if (count && !resume) {
    console.error(`The database already has ${count} products. Pass --resume to finish an interrupted demo seed.`);
    process.exit(1);
  }

  console.log("→ Creating demo accounts");
  const ownerId = await ensureUser(ownerEmail, ownerPassword, "Store Owner", "+592 600 0000");
  must(await admin.from("profiles").update({ role: "owner", permissions: [] }).eq("id", ownerId), "promote owner");
  const staffId = await ensureUser("staff@jagmarket.test", DEMO_PASSWORD, "Kevin Persaud", "+592 600 1111");
  must(await admin.from("profiles").update({ role: "staff", permissions: ["orders", "products"] }).eq("id", staffId), "set staff");
  const customers = [
    ["ann@jagmarket.test", "Ann Williams", "+592 621 4455", "Lot 12 Lamaha Street", "Georgetown", "Georgetown"],
    ["devon@jagmarket.test", "Devon Ramsaroop", "+592 654 2210", "45 Public Road", "Diamond", "East Bank Demerara"],
    ["priya@jagmarket.test", "Priya Singh", "+592 670 9081", "8 Main Street", "New Amsterdam", "Berbice"],
    ["marcus@jagmarket.test", "Marcus Thom", "+592 612 3344", "22 Republic Avenue", "Mackenzie", "Linden"],
    ["shanice@jagmarket.test", "Shanice Fraser", "+592 698 7766", "3 Sea Wall Road", "Enmore", "East Coast Demerara"],
  ];
  const zones = must(await admin.from("delivery_zones").select("id, name, is_pickup"), "load zones");
  const customerIds = [];
  for (const [email, name, phone, address, city, zoneName] of customers) {
    const id = await ensureUser(email, DEMO_PASSWORD, name, phone);
    const zone = zones.find((z) => z.name === zoneName);
    must(
      await admin.from("profiles").update({ phone, address_line: address, city, delivery_zone_id: zone?.id ?? null }).eq("id", id),
      "customer profile",
    );
    customerIds.push({ id, email, name, phone, address, city, zoneId: zone?.id });
  }

  console.log("→ Downloading the demo catalog");
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Couldn't download ${SOURCE} (${res.status})`);
  const source = (await res.json()).products.filter((p) => CATEGORY_MAP[p.category]);

  console.log("→ Categories and brands");
  const categoryIds = new Map();
  const usedSlugs = new Set();
  async function category(path) {
    const key = path.join(" › ");
    if (categoryIds.has(key)) return categoryIds.get(key);
    const parentId = path.length > 1 ? await category(path.slice(0, -1)) : null;
    const name = path.at(-1);
    // Third-level names repeat (Women › Shoes, Men › Shoes), so prefix them: women-shoes.
    let slug = path.length > 2 ? slugify(`${path.at(-2)} ${name}`) : slugify(name);
    if (usedSlugs.has(slug)) slug = slugify(path.join(" "));
    usedSlugs.add(slug);
    const featured = FEATURED_CATEGORIES.has(name) || FEATURED_CATEGORIES.has(key);
    const sort = path.length === 1 ? ROOT_ORDER.indexOf(name) : categoryIds.size;
    const row =
      must(await admin.from("categories").select("id").eq("slug", slug).maybeSingle(), `category ${key}`) ??
      must(
        await admin
          .from("categories")
          .insert({ parent_id: parentId, name, slug, sort_order: sort, is_featured: featured })
          .select("id")
          .single(),
        `category ${key}`,
      );
    categoryIds.set(key, row.id);
    return row.id;
  }
  for (const root of ROOT_ORDER) await category([root]);
  for (const path of Object.values(CATEGORY_MAP)) await category(path);

  const brandIds = new Map();
  for (const name of [...new Set(source.map((p) => p.brand).filter(Boolean))].sort()) {
    const row =
      must(await admin.from("brands").select("id").eq("slug", slugify(name)).maybeSingle(), `brand ${name}`) ??
      must(await admin.from("brands").insert({ name, slug: slugify(name) }).select("id").single(), `brand ${name}`);
    brandIds.set(name, row.id);
  }

  console.log("→ Attributes");
  const attributes = must(await admin.from("attributes").select("id, slug"), "load attributes");
  const sizeAttr = attributes.find((a) => a.slug === "size");
  const colourAttr = attributes.find((a) => a.slug === "colour");
  const shoeAttr =
    attributes.find((a) => a.slug === "shoe-size") ??
    must(
      await admin
        .from("attributes")
        .insert({ name: "Shoe size", slug: "shoe-size", kind: "select", is_filterable: true, is_option: true, sort_order: 2 })
        .select("id")
        .single(),
      "shoe size attribute",
    );
  const shoeValues = must(
    await admin
      .from("attribute_values")
      .upsert(
        ["6", "7", "8", "9", "10", "11", "12"].map((v, i) => ({ attribute_id: shoeAttr.id, value: v, slug: v, sort_order: i })),
        { onConflict: "attribute_id,slug" },
      )
      .select("id, value"),
    "shoe sizes",
  );
  const values = must(await admin.from("attribute_values").select("id, value, attribute_id"), "load values");
  const valueId = (attributeId, value) => values.find((v) => v.attribute_id === attributeId && v.value === value)?.id;
  const shoeValueId = (value) => shoeValues.find((v) => v.value === value)?.id;

  console.log(`→ ${source.length} products with photos (this takes a minute)`);
  const now = Date.now();
  const created = await pool(source, 6, async (p, index) => {
    const path = CATEGORY_MAP[p.category];
    const price = gyd(p.price);
    const onSale = p.discountPercentage >= 8 && index % 3 !== 1;
    const salePrice = onSale ? Math.max(50, Math.round((price * (1 - p.discountPercentage / 100)) / 50) * 50) : null;
    const saleEndsAt = onSale && index % 5 === 0 ? new Date(now + (6 + (index % 60)) * 3600_000).toISOString() : null;
    const stock = index % 23 === 0 ? 0 : index % 11 === 0 ? 2 + (index % 3) : Math.min(80, Math.max(6, Math.round(p.stock / 2)));

    const specs = [
      p.weight ? { label: "Weight", value: `${p.weight} kg` } : null,
      p.dimensions
        ? { label: "Dimensions", value: `${p.dimensions.width} × ${p.dimensions.height} × ${p.dimensions.depth} cm` }
        : null,
      p.warrantyInformation && !/no warranty/i.test(p.warrantyInformation) ? { label: "Warranty", value: p.warrantyInformation } : null,
    ].filter(Boolean);

    const slug = `${slugify(p.title)}-${p.id}`;
    const existing = must(
      await admin.from("products").select("id, product_images(url, sort_order), reviews(id)").eq("slug", slug).maybeSingle(),
      `product ${p.title}`,
    );
    const product = existing ?? must(
      await admin
        .from("products")
        .insert({
          title: p.title,
          slug,
          description: `${p.description}\n\n${p.tags?.length ? `**Good for:** ${p.tags.join(", ")}` : ""}`.trim(),
          price,
          sale_price: salePrice,
          sale_ends_at: saleEndsAt,
          sku: p.sku,
          stock,
          brand_id: p.brand ? brandIds.get(p.brand) : null,
          category_id: categoryIds.get(path.join(" › ")),
          is_featured: index % 9 === 0,
          specifications: specs,
          sold_count: Math.round(rand() * 120),
          created_at: new Date(now - (source.length - index) * 3 * 3600_000).toISOString(),
        })
        .select("id")
        .single(),
      `product ${p.title}`,
    );

    // Photos: copy into our bucket so the demo exercises the real image pipeline.
    const existingImages = [...(existing?.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const photos = existingImages.length ? [] : (p.images ?? []).slice(0, 4);
    const imageRows = [];
    for (const [i, src] of photos.entries()) {
      try {
        const img = await fetchWithRetry(src);
        if (!img.ok) continue;
        const type = img.headers.get("content-type") ?? "image/webp";
        const ext = type.includes("png") ? "png" : type.includes("jpeg") ? "jpg" : "webp";
        const storagePath = `demo/${slug}/${i + 1}.${ext}`;
        const upload = await admin.storage
          .from("product-images")
          .upload(storagePath, Buffer.from(await img.arrayBuffer()), { contentType: type, upsert: true, cacheControl: "31536000" });
        if (upload.error) continue;
        const { data } = admin.storage.from("product-images").getPublicUrl(storagePath);
        imageRows.push({ product_id: product.id, url: data.publicUrl, storage_path: storagePath, alt: i === 0 ? p.title : null, sort_order: i });
      } catch {
        // Skip a photo that fails to download.
      }
    }
    if (imageRows.length) must(await admin.from("product_images").insert(imageRows), "product images");

    // Sizes and colours.
    const attrRows = [];
    if (CLOTHING.has(p.category)) {
      for (const size of index % 2 ? ["S", "M", "L", "XL"] : ["XS", "S", "M", "L"]) attrRows.push(valueId(sizeAttr.id, size));
    }
    if (SHOES.has(p.category)) {
      const sizes = p.category === "womens-shoes" ? ["6", "7", "8", "9", "10"] : ["8", "9", "10", "11", "12"];
      for (const size of sizes) attrRows.push(shoeValueId(size));
    }
    const text = `${p.title} ${p.description}`.toLowerCase();
    const colours = [...new Set(Object.entries(COLOUR_WORDS).filter(([w]) => new RegExp(`\\b${w}\\b`).test(text)).map(([, c]) => c))];
    if (colours.length === 0 && (CLOTHING.has(p.category) || SHOES.has(p.category) || p.category === "womens-bags")) {
      colours.push(...sample(["Black", "White", "Red", "Blue", "Beige", "Pink", "Green", "Navy"], 1 + (index % 3)));
    }
    for (const c of colours.slice(0, 4)) attrRows.push(valueId(colourAttr.id, c));
    const rows = [...new Set(attrRows.filter(Boolean))].map((id) => ({ product_id: product.id, attribute_value_id: id }));
    if (rows.length) {
      must(
        await admin.from("product_attribute_values").upsert(rows, { onConflict: "product_id,attribute_value_id", ignoreDuplicates: true }),
        "product attributes",
      );
    }

    // Reviews from the demo customers.
    const reviewers = existing?.reviews?.length ? [] : sample(customerIds, Math.min(3, p.reviews?.length ?? 0));
    const reviews = (p.reviews ?? []).slice(0, reviewers.length).map((r, i) => ({
      product_id: product.id,
      user_id: reviewers[i].id,
      author_name: reviewers[i].name.split(" ")[0],
      rating: r.rating,
      title: REVIEW_TITLES[r.rating] ?? null,
      body: r.comment,
      is_verified_purchase: i === 0,
      status: "published",
      created_at: new Date(now - (i + 1) * (index + 3) * 3600_000).toISOString(),
    }));
    if (reviews.length) must(await admin.from("reviews").insert(reviews), "reviews");

    if ((index + 1) % 25 === 0) console.log(`  ${index + 1} / ${source.length}`);
    const image = existingImages[0]?.url ?? imageRows[0]?.url ?? null;
    return { id: product.id, slug, title: p.title, category: p.category, image, hasOptions: rows.length > 0 };
  });

  console.log("→ Homepage banners");
  const find = (cat) => created.find((c) => c.category === cat && c.image);
  const phone = find("smartphones");
  const dress = find("womens-dresses");
  const kitchen = find("kitchen-accessories");
  const beauty = find("fragrances");
  const shoe = find("womens-shoes");
  const sport = find("sports-accessories");
  const banners = [
    phone && { title: "New phones, ready for Guyana", subtitle: "The latest Apple, Samsung and Oppo — pay cash on delivery.", cta_label: "Shop phones", link_url: "/c/phones", image_url: phone.image, placement: "hero", layout: "split", theme: "ink", sort_order: 0 },
    dress && { title: "Fresh looks for the season", subtitle: "Dresses, tops and shoes in every size. Free delivery over G$20,000.", cta_label: "Shop fashion", link_url: "/c/fashion", image_url: dress.image, placement: "hero", layout: "split", theme: "gold", sort_order: 1 },
    kitchen && { title: "Deals for the kitchen", subtitle: "Up to 20% off cookware and tools this week.", cta_label: "See today's deals", link_url: "/deals", image_url: kitchen.image, placement: "hero", layout: "split", theme: "red", sort_order: 2 },
    beauty && { title: "Fragrances they'll remember", subtitle: "Gift-ready perfumes from top brands.", cta_label: "Shop fragrances", link_url: "/c/fragrances", image_url: beauty.image, placement: "promo", layout: "split", theme: "mist", sort_order: 0 },
    shoe && { title: "Step out in style", subtitle: "Women's shoes from G$4,000.", cta_label: "Shop shoes", link_url: "/c/women-shoes", image_url: shoe.image, placement: "promo", layout: "split", theme: "forest", sort_order: 1 },
    sport && { title: "Game day gear", subtitle: "Balls, rackets and more.", cta_label: "Shop sports", link_url: "/c/sports-outdoors", image_url: sport.image, placement: "promo", layout: "split", theme: "ink", sort_order: 2 },
  ].filter(Boolean);
  const { count: bannerCount } = await admin.from("banners").select("id", { count: "exact", head: true });
  if (!bannerCount) must(await admin.from("banners").insert(banners), "banners");

  must(
    await admin.from("store_settings").update({ order_notification_emails: [ownerEmail], contact_email: "hello@jagmarket.test" }).eq("id", 1),
    "settings",
  );

  const { count: orderCount } = await admin.from("orders").select("id", { count: "exact", head: true });
  if (orderCount) {
    console.log(`
✔ Demo store ready: ${created.length} products (orders were already in place).`);
    return;
  }

  console.log("→ Sample orders");
  const ownerClient = createClient(url, publishable, clientOptions);
  must(await ownerClient.auth.signInWithPassword({ email: ownerEmail, password: ownerPassword }), "owner sign-in");
  const simple = created.filter((c) => !c.hasOptions);
  const methods = ["cash_on_delivery", "cash_on_delivery", "bank_transfer", "mmg"];
  const flows = [
    ["confirmed", "processing", "out_for_delivery", "delivered"],
    ["confirmed", "processing", "out_for_delivery", "delivered"],
    ["confirmed", "processing", "out_for_delivery", "delivered"],
    ["confirmed", "processing"],
    ["confirmed"],
    [],
    [],
    ["cancelled"],
  ];
  const placed = [];
  let n = 0;
  for (const customer of customerIds) {
    const client = createClient(url, publishable, clientOptions);
    must(await client.auth.signInWithPassword({ email: customer.email, password: DEMO_PASSWORD }), `${customer.email} sign-in`);
    for (let k = 0; k < 3; k++) {
      const items = sample(simple, 1 + (n % 3)).map((p) => ({ product_id: p.id, quantity: 1 + (n % 2) }));
      const result = await client.rpc("place_order", {
        p_payload: {
          customer: { name: customer.name, email: customer.email, phone: customer.phone },
          delivery: { zone_id: customer.zoneId, address_line: customer.address, city: customer.city, notes: k === 0 ? "Call when outside, please." : "" },
          payment_method: methods[n % methods.length],
          items,
        },
      });
      if (result.error) {
        console.warn(`  skipped an order: ${result.error.message}`);
        continue;
      }
      placed.push({ ...result.data, flow: flows[n % flows.length], daysAgo: (n * 7) % 29 });
      n++;
    }
  }
  for (const order of placed) {
    for (const status of order.flow) {
      must(
        await ownerClient.rpc("admin_update_order", {
          p_order_id: order.order_id,
          p_status: status,
          p_payment_status: status === "delivered" ? "paid" : null,
          p_note: status === "cancelled" ? "Customer asked to cancel" : null,
          p_customer_notified: false,
        }),
        `update order ${order.order_number}`,
      );
    }
    // Spread orders over the last month so the dashboard chart has history.
    const placedAt = new Date(now - order.daysAgo * 86400_000 - (order.order_number.charCodeAt(order.order_number.length - 1) % 9) * 3600_000);
    must(await admin.from("orders").update({ created_at: placedAt.toISOString() }).eq("id", order.order_id), "backdate order");
    const events = must(await admin.from("order_events").select("id").eq("order_id", order.order_id).order("id"), "events");
    for (const [i, e] of events.entries()) {
      must(
        await admin.from("order_events").update({ created_at: new Date(placedAt.getTime() + i * 5 * 3600_000).toISOString() }).eq("id", e.id),
        "backdate event",
      );
    }
  }

  console.log(`\n✔ Demo store ready: ${created.length} products, ${placed.length} orders.`);
  console.log(`  Dashboard: http://localhost:3000/admin  (${ownerEmail})`);
  console.log("  Demo passwords are set in scripts/seed-demo.mjs (DEMO_PASSWORD) and SEED_OWNER_PASSWORD.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
