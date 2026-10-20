"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteBanner, moveBanner, setBannerActive } from "@/app/admin/banners/actions";
import type { ActionResult } from "@/lib/action-result";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Toggle } from "@/components/admin/toggle";

function report(result: ActionResult) {
  if (!result.ok) toast.error(result.error);
  else if (result.message) toast.success(result.message);
}

export function BannerActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Toggle
      label={active ? "Shown" : "Hidden"}
      checked={active}
      disabled={pending}
      onChange={(next) => startTransition(async () => report(await setBannerActive(id, next)))}
      className="w-28"
    />
  );
}

export function BannerMoveButtons({ id, first, last }: { id: string; first: boolean; last: boolean }) {
  const [pending, startTransition] = useTransition();
  const btn =
    "inline-flex size-8 items-center justify-center rounded-lg border border-line-strong bg-white text-ink hover:border-ink disabled:opacity-30";
  return (
    <div className="flex gap-1">
      <button
        type="button"
        className={btn}
        disabled={first || pending}
        aria-label="Move up"
        onClick={() => startTransition(async () => report(await moveBanner(id, "up")))}
      >
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        className={btn}
        disabled={last || pending}
        aria-label="Move down"
        onClick={() => startTransition(async () => report(await moveBanner(id, "down")))}
      >
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
}

export function DeleteBannerButton({ id, onDeleted }: { id: string; onDeleted?: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmButton
      confirmLabel="Click again to delete"
      disabled={pending}
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteBanner(id);
          report(result);
          if (result.ok) onDeleted?.();
        })
      }
    >
      Delete
    </ConfirmButton>
  );
}
