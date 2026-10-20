import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getDeliveryZones } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { PasswordForm, ProfileForm } from "@/components/account/profile-forms";

export const instant = false;
export const metadata: Metadata = { title: "Profile & address", robots: { index: false } };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const supabase = await createClient();
  const [{ data: profile }, zones] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, address_line, city, delivery_zone_id").eq("id", user.id).maybeSingle(),
    getDeliveryZones(),
  ]);

  return (
    <div className="space-y-5">
      <section className="rounded-[20px] bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-bold text-ink">Your details</h2>
        <p className="mb-5 text-sm text-muted">We use these to fill in checkout for you. Signed in as {user.email}.</p>
        <ProfileForm
          zones={zones.map((z) => ({ id: z.id, name: z.name }))}
          initial={{
            full_name: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            address_line: profile?.address_line ?? "",
            city: profile?.city ?? "",
            delivery_zone_id: profile?.delivery_zone_id ?? "",
          }}
        />
      </section>
      <section className="rounded-[20px] bg-white p-5 shadow-card sm:p-6">
        <h2 className="mb-5 text-lg font-bold text-ink">Change password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
