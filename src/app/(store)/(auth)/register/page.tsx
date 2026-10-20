import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="You can always check out as a guest — an account just keeps your orders and wishlist in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-canopy hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthCard>
  );
}
