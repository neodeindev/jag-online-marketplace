"use client";

import { Check, EyeOff, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteReview, setReviewStatus } from "@/app/admin/reviews/actions";
import type { ActionResult } from "@/lib/action-result";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Button } from "@/components/ui/button";

export function ReviewActions({ id, status }: { id: string; status: "pending" | "published" | "hidden" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Done");
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "published" && (
        <Button size="sm" variant="canopy" disabled={pending} onClick={() => run(() => setReviewStatus(id, "published"))}>
          <Check className="size-4" /> Publish
        </Button>
      )}
      {status !== "hidden" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setReviewStatus(id, "hidden"))}>
          <EyeOff className="size-4" /> Hide
        </Button>
      )}
      {status === "hidden" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setReviewStatus(id, "pending"))}>
          <Undo2 className="size-4" /> Back to pending
        </Button>
      )}
      <ConfirmButton confirmLabel="Click again to delete" disabled={pending} onConfirm={() => run(() => deleteReview(id))}>
        <Trash2 className="size-4" /> Delete
      </ConfirmButton>
    </div>
  );
}
