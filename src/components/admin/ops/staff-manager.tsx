"use client";

import { Copy, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addStaff, removeStaffAccess, setStaffAccess } from "@/app/admin/staff/actions";
import type { StaffPermission, UserRole } from "@/lib/types";
import { PERMISSION_LABELS } from "@/components/admin/admin-nav";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Pill, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";

export interface StaffMember {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  permissions: StaffPermission[];
  created_at: string;
}

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as StaffPermission[];

function generatePassword() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
}

function PermissionChecklist({
  value,
  onChange,
}: {
  value: StaffPermission[];
  onChange: (next: StaffPermission[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold text-ink">What they can manage</legend>
      {ALL_PERMISSIONS.map((p) => (
        <label key={p} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 hover:border-line-strong">
          <Checkbox
            className="mt-0.5"
            checked={value.includes(p)}
            onChange={(e) => onChange(e.target.checked ? [...value, p] : value.filter((v) => v !== p))}
          />
          <span>
            <span className="block text-[14px] font-semibold text-ink">{PERMISSION_LABELS[p].label}</span>
            <span className="block text-[13px] text-muted">{PERMISSION_LABELS[p].description}</span>
          </span>
        </label>
      ))}
      <p className="text-[12.5px] text-muted">Only the owner can change settings, delivery areas and staff.</p>
    </fieldset>
  );
}

export function StaffManager({ staff, currentUserId }: { staff: StaffMember[]; currentUserId: string }) {
  const [mode, setMode] = useState<
    | { kind: "closed" }
    | { kind: "add" }
    | { kind: "edit"; member: StaffMember }
    | { kind: "existing"; userId: string; name: string | null; email: string }
    | { kind: "created"; name: string; email: string; password: string }
  >({ kind: "closed" });
  const [form, setForm] = useState({ email: "", fullName: "", password: "", permissions: ["orders"] as StaffPermission[] });
  const [perms, setPerms] = useState<StaffPermission[]>([]);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldError = (key: string) => (error?.field === key ? error.message : undefined);
  const close = () => setMode({ kind: "closed" });

  function openAdd() {
    setError(null);
    setForm({ email: "", fullName: "", password: generatePassword(), permissions: ["orders"] });
    setMode({ kind: "add" });
  }

  function submitAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addStaff(form);
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        toast.error(result.error);
        return;
      }
      if (result.data.status === "exists") {
        setPerms(form.permissions);
        setMode({ kind: "existing", userId: result.data.userId, name: result.data.name, email: result.data.email });
        return;
      }
      toast.success(result.message ?? "Staff member added");
      setMode({ kind: "created", name: form.fullName, email: form.email.trim().toLowerCase(), password: form.password });
    });
  }

  function submitAccess(userId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setStaffAccess({ userId, permissions: perms });
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Access updated");
      close();
    });
  }

  const sheetTitle =
    mode.kind === "add"
      ? "Add staff member"
      : mode.kind === "edit"
        ? `Edit access — ${mode.member.full_name ?? mode.member.email}`
        : mode.kind === "existing"
          ? "Give an existing account access"
          : mode.kind === "created"
            ? "Share these sign-in details"
            : "";

  return (
    <>
      <div className="flex justify-end border-b border-line px-5 py-3">
        <Button onClick={openAdd}>
          <UserPlus className="size-4" /> Add staff member
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Person</Th>
            <Th>Role</Th>
            <Th>Can manage</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {staff.map((m) => (
            <tr key={m.id}>
              <Td>
                <p className="font-semibold text-ink">
                  {m.full_name ?? "—"}
                  {m.id === currentUserId && <span className="ml-2 text-[12px] font-normal text-muted">(you)</span>}
                </p>
                <p className="text-[12.5px] text-muted">{m.email}</p>
              </Td>
              <Td>
                {m.role === "owner" ? (
                  <Pill tone="warn">
                    <ShieldCheck className="mr-1 size-3.5" /> Owner
                  </Pill>
                ) : (
                  <Pill>Staff</Pill>
                )}
              </Td>
              <Td className="text-[13px] text-muted">
                {m.role === "owner"
                  ? "Everything"
                  : m.permissions.length
                    ? m.permissions.map((p) => PERMISSION_LABELS[p]?.label ?? p).join(", ")
                    : "Nothing yet"}
              </Td>
              <Td className="text-right">
                {m.role === "staff" && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        setPerms(m.permissions);
                        setMode({ kind: "edit", member: m });
                      }}
                    >
                      Edit access
                    </Button>
                    <ConfirmButton
                      confirmLabel="Click again to remove"
                      disabled={pending}
                      onConfirm={() =>
                        startTransition(async () => {
                          const result = await removeStaffAccess(m.id);
                          if (result.ok) toast.success(result.message ?? "Removed");
                          else toast.error(result.error);
                        })
                      }
                    >
                      Remove access
                    </ConfirmButton>
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Sheet
        open={mode.kind !== "closed"}
        onClose={close}
        title={sheetTitle}
        footer={
          mode.kind === "add" ? (
            <div className="flex gap-2">
              <Button onClick={submitAdd} disabled={pending}>
                {pending ? "Adding…" : "Add staff member"}
              </Button>
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
            </div>
          ) : mode.kind === "edit" || mode.kind === "existing" ? (
            <div className="flex gap-2">
              <Button
                onClick={() => submitAccess(mode.kind === "edit" ? mode.member.id : mode.userId)}
                disabled={pending}
              >
                {pending ? "Saving…" : mode.kind === "edit" ? "Save access" : "Give access"}
              </Button>
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
            </div>
          ) : mode.kind === "created" ? (
            <Button onClick={close}>Done</Button>
          ) : undefined
        }
      >
        <div className="space-y-5 px-5 py-5">
          {error && !error.field && <p className="rounded-lg bg-flag-50 px-3 py-2 text-[13px] text-flag-600">{error.message}</p>}

          {mode.kind === "add" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitAdd();
              }}
            >
              <Field label="Full name" htmlFor="staff-name" error={fieldError("fullName")}>
                <Input
                  id="staff-name"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  autoComplete="off"
                />
              </Field>
              <Field label="Email" htmlFor="staff-email" hint="They'll use this to sign in." error={fieldError("email")}>
                <Input
                  id="staff-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Temporary password"
                htmlFor="staff-password"
                hint="They can change it after signing in, from Forgot password."
                error={fieldError("password")}
              >
                <div className="flex gap-2">
                  <Input
                    id="staff-password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}
                  >
                    <KeyRound className="size-4" /> New
                  </Button>
                </div>
              </Field>
              <PermissionChecklist
                value={form.permissions}
                onChange={(permissions) => setForm((f) => ({ ...f, permissions }))}
              />
              {fieldError("permissions") && <p className="text-[13px] font-medium text-flag">{fieldError("permissions")}</p>}
              <button type="submit" className="hidden" />
            </form>
          )}

          {mode.kind === "edit" && (
            <>
              <PermissionChecklist value={perms} onChange={setPerms} />
              {fieldError("permissions") && <p className="text-[13px] font-medium text-flag">{fieldError("permissions")}</p>}
            </>
          )}

          {mode.kind === "existing" && (
            <>
              <p className="rounded-xl bg-gold-50 p-4 text-[14px] text-ink">
                <strong>{mode.email}</strong> already has an account{mode.name ? ` (${mode.name})` : ""}. Give it dashboard
                access instead? They&apos;ll keep their current password.
              </p>
              <PermissionChecklist value={perms} onChange={setPerms} />
              {fieldError("permissions") && <p className="text-[13px] font-medium text-flag">{fieldError("permissions")}</p>}
            </>
          )}

          {mode.kind === "created" && (
            <div className="space-y-4 text-[14px]">
              <p>
                <strong>{mode.name}</strong> can now sign in. Share these details privately — in person or by WhatsApp,
                not in a group chat. This password won&apos;t be shown again.
              </p>
              <dl className="space-y-3 rounded-xl border border-line p-4">
                <div>
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-muted">Sign-in page</dt>
                  <dd className="font-mono">{typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}</dd>
                </div>
                <div>
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-muted">Email</dt>
                  <dd className="flex items-center gap-2 font-mono">
                    {mode.email}
                    <CopyButton value={mode.email} label="Copy email" icon={<Copy className="size-4" />} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-muted">Temporary password</dt>
                  <dd className="flex items-center gap-2 font-mono text-[16px] font-bold text-ink">
                    {mode.password}
                    <CopyButton value={mode.password} label="Copy password" icon={<Copy className="size-4" />} />
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
