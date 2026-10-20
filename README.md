# JAG Marketplace

Online store and admin dashboard built for Neodein proposal **NGI-MKT-2026-01**: a single-seller marketplace for Guyana with an Amazon-style storefront (header search, category menu, filter sidebar), a private dashboard for products, stock and orders, and checkout by **cash on delivery, bank transfer or MMG**.

| Layer | Technology |
| --- | --- |
| Storefront and dashboard | Next.js 16 (App Router, React 19, Cache Components), Tailwind CSS 4 |
| Database, logins, search, images | Supabase (PostgreSQL 17, Auth, Storage) |
| Hosting and SSL | Netlify |
| Order emails | Brevo transactional API |
| Domain and DNS | Namecheap |

---

## What's included

**Storefront**
- Sticky header with logo, department picker, instant search with suggestions (products, categories, brands, recent searches), account menu, wishlist and cart.
- Homepage: banner carousel, trust strip (delivery + payment methods), category circles, today's deals with countdown, department cards, new arrivals, best sellers, featured picks, recently viewed.
- Search and category pages with an Amazon-style filter sidebar: category tree, price ranges and min/max, brand, attributes (size pills, colour swatches), in stock, on sale; sort by relevance/featured/best selling/newest/price/rating; removable filter chips; slide-up filters on phones; pagination.
- **Typo-tolerant search**: exact prefix matching first ("sams gal" → Samsung Galaxy), then similar spellings when nothing matches ("iphnoe" → iPhone), across titles, brands, categories, attributes, SKUs and descriptions.
- Product pages: photo gallery with full-screen view, size/colour pickers, quantity, add to cart / buy now, stock messages, deal countdown, delivery fees and payment methods, "Ask on WhatsApp", specifications, Markdown description, reviews (verified-purchase badges, moderation), related items. Product JSON-LD for Google.
- Cart drawer and cart page with a free-delivery progress bar; prices and stock re-checked with the server.
- Guest checkout in three steps (details → delivery area → payment) with per-area delivery fees, store pickup, free delivery threshold and bank/MMG instructions. Stock is reserved atomically in the database.
- Order confirmation with status timeline and "send proof of payment" on WhatsApp; order tracking by order number + phone or email.
- Optional customer accounts: order history, wishlist, saved address, password reset.
- Editable policy pages (about, contact, delivery, returns, privacy, terms, FAQ), sitemap, robots, canonical URLs, Open Graph tags.
- Mobile-first: bottom tab bar, sticky buy bar on product pages, swipeable galleries and rails.

**Dashboard** (`/admin`)
- Overview: sales today and for 7/30/90 days, sales chart, pending/unpaid orders, low stock, top products.
- Order inbox: status tabs, search, payment filters; order detail with status updates (optionally emailing the customer), payment status, notes, timeline and printable packing slip. Cancelling returns stock.
- Products: list with filters and bulk actions; editor with multiple photos (resized in the browser before upload), sale price and end date, SKU, stock, brand, nested category, sizes/colours/attributes, specifications, visibility and featuring.
- CSV import (preview, validation, create/update by SKU, auto-creates categories/brands/attributes) and CSV export.
- Categories (nested), brands, attributes and values (colour swatches), review moderation.
- Homepage banners with live preview and scheduling, policy page editor.
- Customers, staff accounts with per-section permissions, delivery areas and fees, store settings (contact details, WhatsApp, payment methods and instructions, order alert emails, announcement bar, free-delivery threshold).

---

## Local development

**Prerequisites:** Node.js 22.9+. Either a free Supabase cloud project for development (no Docker needed) or Docker Desktop for the local Supabase stack.

```bash
npm install
cp .env.example .env      # or .env.local; both are git-ignored and both are read
```

**With a Supabase cloud dev project:** copy the project URL, publishable (or legacy anon) key and secret (or legacy service_role) key from Project Settings → API into `.env`, plus a personal access token (`SUPABASE_ACCESS_TOKEN`, from supabase.com/dashboard/account/tokens) for the CLI. In Authentication → URL Configuration, add `http://localhost:3000/**` to the redirect URLs. Then:

```bash
npx supabase link --project-ref <project-ref>   # the subdomain of the project URL
npm run db:push           # applies supabase/migrations
npm run seed:demo -- --allow-remote   # optional: ~180 demo products, banners, accounts and orders
npm run dev               # http://localhost:3000
```

**With the local stack:** `npm run db:start` prints the URL and keys to put in `.env`; then `npm run db:reset` applies the migrations and `npm run seed:demo` loads the demo data. The local Supabase Studio is at http://127.0.0.1:54323 and captured auth emails at http://127.0.0.1:54324.

Demo accounts (development only) are listed at the top of [`scripts/seed-demo.mjs`](scripts/seed-demo.mjs). If a seed run is interrupted, run it again with `--resume` added to finish it. Never run the demo seed against the production project.

New Supabase projects don't grant the API roles access to new tables automatically. `supabase/migrations/20261020000100_api_grants.sql` grants it explicitly, so any table added in a later migration needs its own `grant` statements.

Without a demo seed, create the first owner with:

```bash
npm run create-owner -- you@example.com "Your Name"
```

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright) against a production build on port 3100 — run `npx playwright install chromium` once |
| `npm run db:push` | Apply new migrations to the linked Supabase project |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` from the linked project (`db:types:local` for the local stack) |

---

## How it fits together

```
src/
  app/
    (store)/            storefront: home, search, c/[slug], p/[slug], cart, checkout,
                        order/[number], track-order, account, pages/[slug], auth pages
    admin/              dashboard (requires staff role; each section checks permissions)
    api/search/suggest  search-as-you-type endpoint
    auth/               email link handlers (sign-up confirmation, password reset)
  components/           store/, admin/, cart/, checkout/, orders/, ui/ …
  lib/
    catalog.ts          cached public reads (products, categories, settings, pages)
    auth.ts             session + permission helpers for pages and Server Actions
    orders.ts           order lookups and order emails
    email/              Brevo client and email templates
  proxy.ts              refreshes the Supabase session, guards /admin and /account
supabase/
  migrations/           schema, row level security, search, checkout and import functions
scripts/                create-owner, seed-demo
tests/                  unit (Vitest) and e2e (Playwright)
```

**Security model.** Every table has row level security. Shoppers can only read active products and their own orders; staff access is limited by role (`owner`, `staff`) and permissions (`products`, `orders`, `content`, `customers`). Orders are created only through the `place_order()` database function, which re-prices every item, checks options and stock, locks rows, computes delivery fees and decrements stock in one transaction. Prices from the browser are never trusted. Staff can only change order status through `admin_update_order()`, which records an audit trail and restocks cancelled orders.

**Caching.** Public catalog reads are cached with `"use cache"` and tagged (`catalog`, `content`, `settings`); dashboard changes refresh the store immediately with `updateTag()`. Pages ship a static shell with streamed, per-visitor parts, so they load quickly on mobile data.

**Images.** Uploads are resized in the browser (longest side 1600px, WebP) before going to Supabase Storage, then served in responsive sizes by Next.js Image (Netlify Image CDN in production).

---

## Deployment

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com) (region: `us-east-1` is closest to Guyana).
2. Link and push the database:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
3. **Authentication → URL configuration**: Site URL `https://yourdomain.gy`; redirect URLs `https://yourdomain.gy/**` (add the Netlify preview URL while testing).
4. **Authentication → Providers → Email**: keep "Confirm email" on. Set the minimum password length to 8.
5. **Authentication → Emails → SMTP settings**: use Brevo's SMTP relay (`smtp-relay.brevo.com`, port 587, your Brevo SMTP login and key) so sign-up and password emails come from your domain.
6. Create the owner: `node --env-file=.env.production scripts/create-owner.mjs owner@yourdomain.gy "Owner Name"` (with the production URL and secret key in that file).

### 2. Brevo
1. Create an account, then **Senders, domains & dedicated IPs → Domains → Add a domain** for `yourdomain.gy` and add the DKIM and Brevo code records it shows in Namecheap (step 4).
2. Create an API key (**SMTP & API → API keys**) for `BREVO_API_KEY`, and add a sender such as `orders@yourdomain.gy`.

### 3. Netlify
1. **Add new site → Import an existing project** and pick this repository. Netlify reads `netlify.toml` and installs the Next.js runtime automatically.
2. **Site configuration → Environment variables**:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.gy` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
   | `SUPABASE_SECRET_KEY` | Secret (service role) key — mark as secret |
   | `BREVO_API_KEY` | Brevo API key — mark as secret |
   | `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` | e.g. `orders@yourdomain.gy` / store name |

3. Deploy. Then **Domain management → Add a domain** for `yourdomain.gy` and `www.yourdomain.gy` (Netlify issues the free SSL certificate once DNS points at it).

### 4. Namecheap DNS (Advanced DNS)

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `75.2.60.5` (Netlify load balancer) |
| CNAME | `www` | `<your-site>.netlify.app` |
| MX / TXT | as given by your email provider | business email (e.g. Zoho, Google Workspace) |
| TXT (SPF) | `@` | `v=spf1 include:spf.brevo.com include:<email provider> ~all` |
| TXT / CNAME (DKIM) | as given by Brevo and your email provider | |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.gy` |

Set the primary domain in Netlify so `www` redirects to the apex (or the other way round). Check the current Netlify IP in their docs before launch.

### 5. Before launch
- In **Dashboard → Settings**: store name, logo, contact details, WhatsApp number, bank and MMG instructions, order alert emails.
- **Delivery areas**: real fees and times. **Policy pages**: replace every `[placeholder]`.
- Delete demo data if it was ever loaded anywhere other than local development.
- Place a test order for each payment method and confirm the emails arrive.

---

## Out of scope (per the proposal)
Online card payments, multi-vendor selling, mobile apps, photography, copywriting and marketing. The schema leaves room for these (for example, a payment provider can be added alongside `place_order()`).
