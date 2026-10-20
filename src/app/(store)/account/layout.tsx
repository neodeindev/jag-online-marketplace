import { requireUser } from "@/lib/auth";
import { AccountNav } from "@/components/account/account-nav";

export const instant = false;

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireUser("/account");
  const firstName = user.fullName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";
  return (
    <div className="container-page pt-6">
      <div className="mb-6">
        <p className="text-sm text-muted">Your account</p>
        <h1 className="display text-[28px] font-black text-ink">Hello, {firstName}</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <AccountNav isStaff={user.role !== "customer"} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
