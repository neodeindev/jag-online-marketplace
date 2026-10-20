-- =============================================================================
-- Starting content every new store needs. All of it is editable in the
-- dashboard; text in [square brackets] is a placeholder for the owner to fill.
-- =============================================================================

insert into public.store_settings (
  id, store_name, tagline, contact_email, contact_phone, whatsapp_number, address, business_hours,
  free_delivery_threshold, bank_transfer_instructions, mmg_instructions, announcement
) values (
  1,
  'JAG Marketplace',
  'Everything you need, delivered across Guyana',
  'orders@example.com',
  '+592 600 0000',
  '5926000000',
  'Georgetown, Guyana',
  'Mon–Sat, 8:00 am – 6:00 pm',
  20000,
  E'Transfer the order total to:\n\nBank: [Bank name]\nAccount name: [Account name]\nAccount number: [Account number]\n\nUse your order number as the payment reference, then send a photo of the receipt on WhatsApp.',
  E'Send the order total by MMG to [MMG number] ([Account name]).\n\nUse your order number as the reference, then send us the transaction ID on WhatsApp.',
  'Free delivery on orders over G$20,000 · Pay cash on delivery, bank transfer or MMG'
)
on conflict (id) do nothing;

insert into public.delivery_zones (name, description, fee, estimated_days, is_pickup, sort_order) values
  ('Store pickup', 'Collect your order from our location. We''ll call when it''s ready.', 0, 'Ready same day', true, 0),
  ('Georgetown', 'All Georgetown neighbourhoods', 1000, 'Same or next day', false, 1),
  ('East Bank Demerara', 'Providence to Timehri', 1500, '1–2 business days', false, 2),
  ('East Coast Demerara', 'Better Hope to Mahaica', 1500, '1–2 business days', false, 3),
  ('West Demerara', 'West Bank and West Coast Demerara', 2000, '1–2 business days', false, 4),
  ('Linden', 'Region 10', 3000, '2–3 business days', false, 5),
  ('Berbice', 'Regions 5 and 6', 3000, '2–3 business days', false, 6),
  ('Essequibo Coast', 'Region 2', 3500, '2–4 business days', false, 7);

with size as (
  insert into public.attributes (name, slug, kind, is_filterable, is_option, sort_order)
  values ('Size', 'size', 'select', true, true, 0)
  returning id
)
insert into public.attribute_values (attribute_id, value, slug, sort_order)
select size.id, v.value, v.slug, v.sort_order
from size, (values
  ('XS', 'xs', 0), ('S', 's', 1), ('M', 'm', 2), ('L', 'l', 3), ('XL', 'xl', 4), ('XXL', 'xxl', 5)
) as v(value, slug, sort_order);

with colour as (
  insert into public.attributes (name, slug, kind, is_filterable, is_option, sort_order)
  values ('Colour', 'colour', 'color', true, true, 1)
  returning id
)
insert into public.attribute_values (attribute_id, value, slug, color_hex, sort_order)
select colour.id, v.value, v.slug, v.hex, v.sort_order
from colour, (values
  ('Black', 'black', '#1B1B1B', 0),
  ('White', 'white', '#FFFFFF', 1),
  ('Grey', 'grey', '#9AA0A6', 2),
  ('Beige', 'beige', '#D9C7A7', 3),
  ('Brown', 'brown', '#7A5230', 4),
  ('Red', 'red', '#D62839', 5),
  ('Pink', 'pink', '#F2A7C3', 6),
  ('Orange', 'orange', '#F28C28', 7),
  ('Yellow', 'yellow', '#FFC21A', 8),
  ('Green', 'green', '#127A55', 9),
  ('Blue', 'blue', '#2563EB', 10),
  ('Navy', 'navy', '#1E2A4A', 11),
  ('Purple', 'purple', '#7C3AED', 12),
  ('Gold', 'gold', '#C9A227', 13),
  ('Silver', 'silver', '#C0C4CC', 14)
) as v(value, slug, hex, sort_order);

-- Policy pages. {{store_name}}, {{contact_email}}, {{contact_phone}} and
-- {{address}} are filled in from store settings when the page is shown.
insert into public.pages (slug, title, sort_order, content) values
('about', 'About us', 0, $md$
{{store_name}} is a Guyanese online store bringing quality products to your door, wherever you are in the country.

We keep things simple: honest prices in Guyana dollars, real photos, and payment the way that suits you — cash on delivery, bank transfer or MMG.

## Why shop with us

- **Delivery across Guyana** — from Georgetown to Berbice and the Essequibo Coast.
- **Pay when it arrives** — no card needed.
- **Real people** — questions answered on WhatsApp, phone or email.

[Tell your story here: when the business started, who runs it, and what you care about.]
$md$),
('contact', 'Contact us', 1, $md$
We're happy to help with orders, delivery and product questions.

- **Phone / WhatsApp:** {{contact_phone}}
- **Email:** {{contact_email}}
- **Address:** {{address}}

When writing about an order, include your order number so we can find it quickly.
$md$),
('delivery', 'Delivery information', 2, $md$
## Where we deliver

We deliver across Guyana. Delivery fees and estimated times for each area are shown at checkout before you place your order.

## When your order arrives

Orders placed before 2:00 pm on a business day are usually prepared the same day. We'll call or WhatsApp you to confirm your order and arrange a delivery time.

## Store pickup

Prefer to collect? Choose **Store pickup** at checkout and we'll let you know when your order is ready.

## Free delivery

Orders above the free-delivery amount shown in the cart ship free to any delivery area.
$md$),
('returns', 'Returns & refunds', 3, $md$
We want you to be happy with your order.

## Returns

- You can return most items within **7 days** of delivery if they are unused, in their original packaging and with all tags attached.
- Contact us at {{contact_phone}} or {{contact_email}} with your order number to arrange a return.
- For hygiene reasons, some items (such as underwear, cosmetics and earrings) can't be returned unless faulty.

## Damaged or wrong items

If an item arrives damaged or isn't what you ordered, tell us within **48 hours** and we'll replace it or refund you at no cost.

## Refunds

Approved refunds are paid by bank transfer or MMG within 5 business days of us receiving the returned item.

[Review this policy and adjust the time limits to match how your business works.]
$md$),
('privacy', 'Privacy policy', 4, $md$
This policy explains what information {{store_name}} collects and how we use it.

## What we collect

- **Order details:** your name, phone number, email (optional), delivery address and the items you buy.
- **Account details:** if you create an account, your login email and the profile details you save.

## How we use it

We use your information only to process and deliver your orders, contact you about them, and improve our service. We never sell your information.

## Who we share it with

Only the people and services needed to complete your order — for example, our delivery staff, and the email service that sends your order receipt.

## Your choices

You can ask us to update or delete your information at any time by contacting {{contact_email}}.
$md$),
('terms', 'Terms of service', 5, $md$
By placing an order with {{store_name}} you agree to these terms.

## Orders and prices

All prices are in Guyana dollars (GYD). An order is confirmed when we contact you to confirm it. If an item becomes unavailable after you order, we'll let you know and refund any payment for it.

## Payment

We accept cash on delivery, bank transfer and MMG. For bank transfer and MMG, your order is prepared once payment is received.

## Delivery

Delivery times are estimates. We'll keep you updated if anything changes.

## Contact

Questions about these terms? Contact us at {{contact_email}}.

[Have these terms reviewed before launch.]
$md$),
('faq', 'Frequently asked questions', 6, $md$
### How do I pay?

Choose cash on delivery, bank transfer or MMG at checkout. You don't need a card.

### How much is delivery?

It depends on your area. You'll see the exact fee at checkout before you place your order.

### How do I track my order?

Use **Track order** at the bottom of any page with your order number and the phone number or email you used at checkout.

### Do I need an account to order?

No. You can check out as a guest. An account lets you see past orders and save a wishlist.

### Can I change or cancel my order?

Contact us as soon as possible on {{contact_phone}}. We can change or cancel orders that haven't been sent out yet.
$md$);
