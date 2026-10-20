"use client";

import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/format";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { useStoreConfig } from "@/components/providers/store-config";

/** Floating "chat with us" button. Hidden during checkout to keep focus on the form. */
export function WhatsAppFloat() {
  const { whatsappNumber, storeName } = useStoreConfig();
  const pathname = usePathname();
  const href = whatsappLink(whatsappNumber, `Hi ${storeName}, I have a question.`);
  if (!href || pathname.startsWith("/checkout") || pathname.startsWith("/p/")) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="no-print fixed bottom-20 right-4 z-30 inline-flex size-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_-6px_rgb(0_0_0/0.35)] transition hover:scale-105 md:bottom-6 md:right-6"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
