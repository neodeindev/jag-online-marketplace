import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      subtitle="See your orders, save a wishlist and check out faster."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-semibold text-canopy hover:underline">
            Create an account
          </Link>
          <span className="mx-2 text-line-strong">·</span>
          <Link href="/track-order" className="font-semibold text-canopy hover:underline">
            Track an order without signing in
          </Link>
        </>
      }
    >
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
