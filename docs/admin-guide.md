# Store dashboard guide

This guide covers everything you do in your store's dashboard: adding products, handling orders and keeping the shop up to date. Open the dashboard at **yourdomain.gy/admin**, or choose **Store dashboard** from the account menu after signing in.

---

## 1. Signing in and staff accounts

- Sign in with the email and password you were given. Change the temporary password straight away: **Account → Profile & address → Change password**.
- Forgot it? Use **Forgot password?** on the sign-in page and follow the email link.
- **Staff accounts** (owner only): **People → Staff accounts → Add staff member**. Choose what they can manage:
  - **Orders** — view orders, change status, mark payments.
  - **Products & catalog** — products, categories, brands, sizes and colours, import/export, reviews.
  - **Storefront content** — homepage banners and policy pages.
  - **Customers** — customer list and contact details.
  The dashboard shows a temporary password once. Share it privately (for example by phone), and ask them to change it. Only the owner can change settings, delivery areas and staff.
- To stop someone's access, choose **Remove access** on their row. Their account stays, but the dashboard is closed to them.

---

## 2. The overview

The first page shows today's orders and sales, sales for the last 7, 30 or 90 days (compared with the period before), orders waiting for you, unpaid orders, products that are low or out of stock, and your best sellers. Click any tile to jump to the matching list.

---

## 3. Orders

New orders arrive in **Orders** and by email (to the addresses in **Settings → Send new-order alerts to**). The **Pending** tab is your to-do list.

**Typical flow**

| Status | When to use it | What the customer sees |
| --- | --- | --- |
| Order placed (pending) | New order, not yet checked | "Order placed" |
| Confirmed | You've called/WhatsApped and confirmed the order | "Confirmed" |
| Being prepared | You're packing it | "Being prepared" |
| Out for delivery / Ready for pickup | It's with the driver, or waiting at the store | "Out for delivery" / "Ready for pickup" |
| Delivered | The customer has it | "Delivered" / "Collected" |
| Cancelled | The order won't go ahead | "Cancelled" |

- Open an order, pick the new status, add a note if useful, and tick **Email the customer about this update** to send them an email (only if they gave an email at checkout). The **WhatsApp** button opens a chat with the customer with the order number filled in.
- **Cancelling** puts the items back in stock automatically. A cancelled order can't be reopened; ask the customer to order again.
- **Payments**: for bank transfer and MMG, wait for the money or the receipt photo, then set the payment to **Paid** (the Unpaid / Paid / Refunded switch on the order). Record the transaction ID in **Payment reference**. For cash on delivery, set it to **Paid** when the driver returns with the cash.
- **Internal notes** are only visible to staff.
- **Packing slip** opens a clean page to print and put in the parcel.
- Customers can check progress any time at **Track your order** with their order number and phone or email.

---

## 4. Products

**Products → Add product.** Fill in the sections, then **Save product**.

- **Title and description.** Use the name customers would search for, such as "Samsung Galaxy A15 128GB Black", not an internal code. The description supports simple formatting: `**bold**`, lists starting with `-`, and headings starting with `##`. Use **Preview** to check it.
- **Web address** fills itself from the title. Only change it if you need to; changing it breaks old links to the product.
- **Price** in Guyana dollars. To run a sale, enter a lower **Sale price**. An optional **Sale ends** time starts a countdown on the product, and the price goes back up automatically afterwards.
- **SKU** is your stock code. Leave it empty and one is created for you. SKUs are how the CSV import matches existing products.
- **Stock.** When it reaches 0 the product shows "Sold out" and can't be ordered. Low stock shows "Only 3 left". Set the low-stock number in Settings. Every order takes stock off automatically.
- **Category and brand.** Pick from the lists, or add a new brand right there.
- **Sizes, colours and other details.** Click the values that apply. Groups marked "shopper picks one", like Size and Colour, become buttons on the product page, and the customer must choose one before adding to cart. Other groups, like Material, only appear in the filters and specifications.
- **Specifications.** Add rows such as "Battery: 5000 mAh" or "Material: Cotton".
- **Photos.** Add several at once and drag them into order; the first photo is the main one. Photos are resized automatically, so you can upload straight from your phone. Square photos on a white or plain background look best.
- **Visibility.** **Hide** takes a product off the store without deleting it. **Feature** adds it to "Picked for you" on the homepage.

**Products list.** Search, filter (category, visibility, low/sold-out stock), and select several products to show, hide, feature or delete them together. Click a stock number to change it quickly.

---

## 5. Importing and exporting products (CSV)

**Catalog → Import / export.**

- **Export** downloads all products as a spreadsheet file (CSV) that opens in Excel or Google Sheets.
- **Import** adds or updates many products at once:
  1. Click **Download template** and fill it in, or start from an export.
  2. Upload the file. Every row is checked first and marked **New**, **Update** (same SKU as an existing product) or **Problem** (explained in plain words).
  3. Import. Rows with problems are skipped and can be fixed and imported again.
- Column tips:
  - **category**: use `>` between levels, for example `Fashion > Women > Dresses`. Missing categories are created.
  - **attributes**: `Size: S|M|L; Colour: Black|Red`.
  - **specifications**: `Material: Cotton; Weight: 200 g`.
  - **images**: photo links separated by `|`.
  - **status**: `active` or `hidden`. **featured**: `yes` or `no`.
- A blank cell leaves that detail unchanged on existing products, except **sale_price**, **brand** and **category**, where a blank cell clears them.

---

## 6. Categories, brands, sizes and colours

- **Categories** can have sub-categories, for example Fashion › Women › Dresses. Use the arrows to change the order in the menu. **Show on homepage** adds the category to the round shortcuts under the banners. A category can't be deleted while it has sub-categories; products in a deleted category become "uncategorised".
- **Brands** appear as a filter and on product pages.
- **Sizes, colours & filters** lists the groups of choices. For colours, set the swatch colour customers see. **Show in filters** puts the group in the search sidebar, and **Shopper picks one** makes customers choose a value before buying.

---

## 7. Reviews

Signed-in customers can review products. New reviews wait under **Reviews → Waiting for review** until you **Publish** them. Reviews from people who received the product are marked "Verified purchase". **Hide** removes a review from the store without deleting it.

---

## 8. Homepage banners

**Storefront → Homepage banners.**

- **Hero carousel** banners are the large slides at the top of the homepage. **Promo tiles** are the smaller cards further down.
- **Split** layout puts your text on a coloured panel beside a product photo, which works well with ordinary product photos. **Cover** layout fills the banner with a wide photo (at least 1600 pixels wide) with your text on top.
- Choose a colour theme, a button label and where it links (for example `/deals` or `/c/phones`). The preview shows exactly how it will look.
- Optional **Show from** and **Hide after** times run promotions automatically. Turn off **Show on the homepage** to hide a banner, and use the arrows to change the order.

---

## 9. Policy pages

**Storefront → Policy pages**: About us, Contact us, Delivery information, Returns & refunds, Privacy policy, Terms of service and FAQ. Before launch, replace every `[text in square brackets]`.

The tokens `{{store_name}}`, `{{contact_email}}`, `{{contact_phone}}` and `{{address}}` are replaced with your current details from Settings, so they stay correct if those change. Pages marked **Show in footer** are linked at the bottom of every page.

---

## 10. Delivery areas (owner)

**Store → Delivery areas** lists where you deliver, the fee for each area, and how long it usually takes. Customers pick an area at checkout and see the fee before ordering.

- **Store pickup** is always free.
- Orders above the **free-delivery amount** in Settings ship free to any area. Leave that setting empty to always charge delivery.
- Turn an area off temporarily rather than deleting it.

---

## 11. Settings (owner)

**Store → Settings**:

- **Store details**: name, tagline, logo, contact email and phone, address and opening hours.
- **WhatsApp number**: digits only with the country code, for example `5926001234`. It powers every "Chat on WhatsApp" and "Ask on WhatsApp" button.
- **Announcement bar**: the line of text at the very top of the store, which is good for promotions. Leave it empty to hide it.
- **Send new-order alerts to**: who gets an email for each new order (separate several with commas). **Order number prefix**: for example `JAG` gives order numbers like `JAG-100045`.
- **Payment methods**: turn cash on delivery, bank transfer and MMG on or off, and write the bank and MMG instructions customers see at checkout, in their email receipt and on the order page.
- **Free delivery** amount and **low stock** warning level.
- **Social links**: Facebook, Instagram and TikTok, shown in the footer.

---

## Everyday checklist

1. Check **Orders → Pending** a few times a day. Confirm each order with the customer, then move it along.
2. Mark bank transfer and MMG orders **paid** once the money arrives.
3. Glance at **low stock** on the overview and restock, or hide products you can't get.
4. Publish or hide new **reviews**.
5. Refresh **banners** and **deals** for promotions.

Need help? Contact Neodein support. Bug fixes are free for the first 3 months after launch.
