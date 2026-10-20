import { Banknote, Clock, Landmark, Mail, MapPin, Phone, Smartphone } from "lucide-react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS, getCategoryTree, getFooterPages, getStoreSettings } from "@/lib/catalog";
import { whatsappLink } from "@/lib/format";
import { Logo } from "@/components/brand/logo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";

export async function SiteFooter() {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.settings, CACHE_TAGS.catalog, CACHE_TAGS.content);

  const [settings, tree, pages] = await Promise.all([getStoreSettings(), getCategoryTree(), getFooterPages()]);
  const wa = whatsappLink(settings.whatsapp_number);
  const year = new Date().getFullYear();
  const helpSlugs = new Set(["delivery", "returns", "faq", "contact"]);
  const helpPages = pages.filter((p) => helpSlugs.has(p.slug));
  const companyPages = pages.filter((p) => !helpSlugs.has(p.slug));
  const socials = [
    { label: "Facebook", href: settings.facebook_url },
    { label: "Instagram", href: settings.instagram_url },
    { label: "TikTok", href: settings.tiktok_url },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <footer className="no-print mt-16 bg-ink text-white/75">
      <div className="flag-rule" />
      <div className="border-b border-white/10">
        <div className="container-page grid gap-4 py-6 sm:grid-cols-3">
          {[
            settings.cash_on_delivery_enabled && {
              icon: <Banknote className="size-5" />,
              title: "Pay on delivery",
              text: "Cash when your order arrives",
            },
            settings.bank_transfer_enabled && {
              icon: <Landmark className="size-5" />,
              title: "Bank transfer",
              text: "Pay from any local bank",
            },
            settings.mmg_enabled && {
              icon: <Smartphone className="size-5" />,
              title: "MMG",
              text: "Mobile money, no card needed",
            },
          ]
            .filter((x) => x !== false)
            .map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold">
                  {item.icon}
                </span>
                <span>
                  <span className="block font-bold text-white">{item.title}</span>
                  <span className="text-sm">{item.text}</span>
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <Logo storeName={settings.store_name} logoUrl={settings.logo_url} />
          {settings.tagline && <p className="mt-4 max-w-xs text-sm leading-relaxed">{settings.tagline}</p>}
          {socials.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-full border border-white/20 px-3 text-[13px] font-semibold text-white hover:border-gold hover:text-gold"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FooterColumn title="Shop">
          <FooterLink href="/deals">Today&apos;s deals</FooterLink>
          <FooterLink href="/search?sort=newest">New arrivals</FooterLink>
          {tree.slice(0, 6).map((c) => (
            <FooterLink key={c.id} href={`/c/${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Help">
          <FooterLink href="/track-order">Track your order</FooterLink>
          {helpPages.map((p) => (
            <FooterLink key={p.slug} href={`/pages/${p.slug}`}>
              {p.title}
            </FooterLink>
          ))}
          {companyPages.map((p) => (
            <FooterLink key={p.slug} href={`/pages/${p.slug}`}>
              {p.title}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Get in touch">
          {wa && (
            <li>
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-ink transition hover:brightness-105"
              >
                <WhatsAppIcon className="size-4" /> Chat on WhatsApp
              </a>
            </li>
          )}
          {settings.contact_phone && (
            <ContactLine icon={<Phone className="size-4" />}>
              <a href={`tel:${settings.contact_phone.replace(/\s/g, "")}`} className="hover:text-white">
                {settings.contact_phone}
              </a>
            </ContactLine>
          )}
          {settings.contact_email && (
            <ContactLine icon={<Mail className="size-4" />}>
              <a href={`mailto:${settings.contact_email}`} className="hover:text-white">
                {settings.contact_email}
              </a>
            </ContactLine>
          )}
          {settings.address && <ContactLine icon={<MapPin className="size-4" />}>{settings.address}</ContactLine>}
          {settings.business_hours && (
            <ContactLine icon={<Clock className="size-4" />}>{settings.business_hours}</ContactLine>
          )}
        </FooterColumn>
      </div>

      <div className="border-t border-white/10">
        {/* Bottom space on phones clears the tab bar or buy bar, plus the home-indicator area. */}
        <div className="container-page flex flex-col gap-2 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] text-[13px] text-white/55 sm:flex-row sm:justify-between md:pb-5">
          <p>
            © {year} {settings.store_name}. Prices in Guyana dollars (GYD).
          </p>
          <p>Proudly Guyanese</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="display-tight mb-4 text-[13px] font-extrabold uppercase tracking-[0.14em] text-white">{title}</h2>
      <ul className="space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="transition hover:text-gold">
        {children}
      </Link>
    </li>
  );
}

function ContactLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 text-gold">{icon}</span>
      <span>{children}</span>
    </li>
  );
}
