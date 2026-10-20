import type { Metadata, Viewport } from "next";
import { Archivo, Figtree, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { getStoreSettings } from "@/lib/catalog";
import { siteUrl } from "@/lib/utils";
import { SessionProvider } from "@/components/providers/session-provider";
import { StoreConfigProvider } from "@/components/providers/store-config";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  const description = settings.tagline ?? `Shop online with ${settings.store_name}. Delivery across Guyana.`;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${settings.store_name} — Shop online in Guyana`, template: `%s | ${settings.store_name}` },
    description,
    applicationName: settings.store_name,
    openGraph: { type: "website", siteName: settings.store_name, locale: "en_GY", description },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#0e2a22",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getStoreSettings();

  return (
    <html lang="en-GY" className={`${archivo.variable} ${figtree.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        <StoreConfigProvider
          value={{
            storeName: settings.store_name,
            whatsappNumber: settings.whatsapp_number,
            freeDeliveryThreshold: settings.free_delivery_threshold,
            contactPhone: settings.contact_phone,
          }}
        >
          <SessionProvider>{children}</SessionProvider>
        </StoreConfigProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!rounded-xl !border-line !font-sans !shadow-pop",
              title: "!font-semibold !text-ink",
              actionButton: "!bg-ink !text-white !font-semibold",
            },
          }}
        />
      </body>
    </html>
  );
}
