"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthState,
} from "@/app/(store)/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "./auth-card";

function useNext(fallback = "/account") {
  const params = useSearchParams();
  return params.get("next") ?? fallback;
}

function PasswordInput({ id, name, autoComplete }: { id: string; name: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required className="pr-11" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function SignInForm() {
  const next = useNext();
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="Email" htmlFor="login-email">
        <Input id="login-email" name="email" type="email" autoComplete="email" defaultValue={state?.fields?.email} required />
      </Field>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="login-password" className="text-sm font-semibold text-ink">
            Password
          </label>
          <Link href="/forgot-password" className="text-[13px] font-semibold text-canopy hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="login-password" name="password" autoComplete="current-password" />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const next = useNext();
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, null);
  if (state?.message) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="Your name" htmlFor="signup-name">
        <Input id="signup-name" name="name" autoComplete="name" defaultValue={state?.fields?.name} required />
      </Field>
      <Field label="Email" htmlFor="signup-email">
        <Input id="signup-email" name="email" type="email" autoComplete="email" defaultValue={state?.fields?.email} required />
      </Field>
      <Field label="Phone / WhatsApp" htmlFor="signup-phone" hint="Optional — saves time at checkout.">
        <Input id="signup-phone" name="phone" type="tel" autoComplete="tel" defaultValue={state?.fields?.phone} />
      </Field>
      <Field label="Password" htmlFor="signup-password" hint="At least 8 characters.">
        <PasswordInput id="signup-password" name="password" autoComplete="new-password" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>
      <p className="text-center text-[12.5px] text-muted">
        By creating an account you agree to our{" "}
        <Link href="/pages/terms" className="underline">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/pages/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, null);
  if (state?.message) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Email" htmlFor="forgot-email">
        <Input id="forgot-email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="New password" htmlFor="reset-password" hint="At least 8 characters.">
        <PasswordInput id="reset-password" name="password" autoComplete="new-password" />
      </Field>
      <Field label="Type it again" htmlFor="reset-confirm">
        <PasswordInput id="reset-confirm" name="confirm" autoComplete="new-password" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
