"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitReview, type ReviewState } from "@/app/(store)/p/[slug]/actions";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const { ready, userId } = useSession();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, null);

  if (!ready) return null;

  if (!userId) {
    return (
      <p className="text-sm text-muted">
        <Link href={`/login?next=/p/${slug}%23reviews`} className="font-semibold text-canopy hover:underline">
          Sign in
        </Link>{" "}
        to write a review.
      </p>
    );
  }

  if (state?.ok) {
    return <p className="rounded-xl bg-canopy-50 px-4 py-3 text-sm font-medium text-canopy-700">{state.message}</p>;
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Write a review
      </Button>
    );
  }

  const shown = hover || rating;

  return (
    <form action={action} className="card max-w-xl space-y-4 p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink">Your rating</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              className={cn("text-[30px] leading-none transition", n <= shown ? "text-gold-500" : "text-line-strong")}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-muted">{LABELS[shown]}</span>
        </div>
      </fieldset>
      <Field label="Headline" htmlFor="review-title" hint="Optional">
        <Input id="review-title" name="title" maxLength={120} placeholder="Sum it up in a few words" />
      </Field>
      <Field label="Your review" htmlFor="review-body" hint="What did you like or dislike? How are you using it?">
        <Textarea id="review-body" name="body" maxLength={2000} rows={4} />
      </Field>
      {state && !state.ok && <p className="text-sm font-medium text-flag">{state.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="dark" disabled={pending || rating === 0}>
          {pending ? "Submitting…" : "Submit review"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
