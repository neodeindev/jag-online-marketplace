"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, updateProfile, type ProfileState } from "@/app/(store)/account/actions";
import { FormMessage } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export function ProfileForm({
  zones,
  initial,
}: {
  zones: { id: string; name: string }[];
  initial: { full_name: string; phone: string; address_line: string; city: string; delivery_zone_id: string };
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, null);
  return (
    <form action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <Field label="Full name" htmlFor="profile-name">
        <Input id="profile-name" name="full_name" autoComplete="name" defaultValue={initial.full_name} required />
      </Field>
      <Field label="Phone / WhatsApp" htmlFor="profile-phone">
        <Input id="profile-phone" name="phone" type="tel" autoComplete="tel" defaultValue={initial.phone} />
      </Field>
      <Field label="Street address" htmlFor="profile-address" className="sm:col-span-2">
        <Input id="profile-address" name="address_line" autoComplete="street-address" defaultValue={initial.address_line} />
      </Field>
      <Field label="Village / town" htmlFor="profile-city">
        <Input id="profile-city" name="city" autoComplete="address-level2" defaultValue={initial.city} />
      </Field>
      <Field label="Delivery area" htmlFor="profile-zone">
        <Select id="profile-zone" name="delivery_zone_id" defaultValue={initial.delivery_zone_id}>
          <option value="">Choose at checkout</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" variant="dark" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <Field label="New password" htmlFor="new-password" hint="At least 8 characters.">
        <Input id="new-password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Type it again" htmlFor="confirm-password">
        <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
