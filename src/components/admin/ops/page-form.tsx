"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { deletePage, savePage } from "@/app/admin/pages/actions";
import { fillTokens } from "@/lib/format";
import { cn, slugify } from "@/lib/utils";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Toggle } from "@/components/admin/toggle";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

export interface PageFormValues {
  id?: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  showInFooter: boolean;
  sortOrder: number;
}

const TOKENS = ["store_name", "contact_email", "contact_phone", "address"];

export function PageForm({ initial, tokens }: { initial: PageFormValues; tokens: Record<string, string | null> }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [view, setView] = useState<"write" | "preview">("write");
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof PageFormValues>(key: K, value: PageFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (error?.field === key) setError(null);
  };
  const fieldError = (key: string) => (error?.field === key ? error.message : undefined);

  const preview = (
    <div className="prose-store">
      {values.content.trim() ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{fillTokens(values.content, tokens)}</ReactMarkdown>
      ) : (
        <p className="text-muted">Nothing to preview yet.</p>
      )}
    </div>
  );

  return (
    <form
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await savePage(values);
          if (!result.ok) {
            setError({ message: result.error, field: result.field });
            toast.error(result.error);
            return;
          }
          toast.success(result.message ?? "Saved");
          if (!values.id) router.replace(`/admin/pages/${result.data.id}`);
        });
      }}
    >
      <div className="space-y-6">
        <Panel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="page-title" error={fieldError("title")}>
              <Input
                id="page-title"
                value={values.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setValues((v) => ({ ...v, title, slug: slugTouched ? v.slug : slugify(title) }));
                }}
                maxLength={120}
                aria-invalid={Boolean(fieldError("title"))}
              />
            </Field>
            <Field label="Web address" htmlFor="page-slug" hint={`Shown at /pages/${values.slug || "…"}`} error={fieldError("slug")}>
              <Input
                id="page-slug"
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                }}
                maxLength={80}
                className="font-mono text-[14px]"
                aria-invalid={Boolean(fieldError("slug"))}
              />
            </Field>
          </div>
        </Panel>

        <Panel
          title="Content"
          actions={
            <div className="flex rounded-lg bg-mist p-0.5 xl:hidden" role="tablist" aria-label="Editor view">
              {(["write", "preview"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "h-8 rounded-md px-3 text-[13px] font-semibold",
                    view === v ? "bg-white text-ink shadow-sm" : "text-muted",
                  )}
                >
                  {v === "write" ? "Write" : "Preview"}
                </button>
              ))}
            </div>
          }
        >
          <div className="grid gap-6 xl:grid-cols-2">
            <div className={cn(view === "preview" && "hidden xl:block")}>
              <label htmlFor="page-content" className="sr-only">
                Page content
              </label>
              <Textarea
                id="page-content"
                value={values.content}
                onChange={(e) => set("content", e.target.value)}
                className="min-h-[520px] font-mono text-[13.5px] leading-relaxed"
                spellCheck
              />
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                Formatting: <code>## Heading</code>, <code>**bold**</code>, <code>- list item</code>,{" "}
                <code>[link text](https://…)</code>. These fill in from your settings:{" "}
                {TOKENS.map((t, i) => (
                  <span key={t}>
                    <code>{`{{${t}}}`}</code>
                    {i < TOKENS.length - 1 ? ", " : "."}
                  </span>
                ))}
              </p>
            </div>
            <div className={cn("rounded-xl border border-line p-5", view === "write" && "hidden xl:block")}>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-subtle">Preview</p>
              <h2 className="display mb-4 text-2xl font-black text-ink">{values.title || "Untitled page"}</h2>
              {preview}
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Visibility">
          <div className="space-y-4">
            <Toggle
              label="Published"
              description="Unpublished pages can't be opened by shoppers."
              checked={values.isPublished}
              onChange={(v) => set("isPublished", v)}
            />
            <Toggle
              label="Show in footer"
              description="Adds a link at the bottom of every page."
              checked={values.showInFooter}
              onChange={(v) => set("showInFooter", v)}
            />
            <Field label="Footer order" htmlFor="page-order" hint="Lower numbers come first.">
              <Input
                id="page-order"
                type="number"
                min={0}
                max={999}
                value={values.sortOrder}
                onChange={(e) => set("sortOrder", Math.max(0, Math.min(999, Number(e.target.value) || 0)))}
                className="w-28"
              />
            </Field>
          </div>
        </Panel>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Saving…" : values.id ? "Save page" : "Create page"}
          </Button>
          {values.id && values.isPublished && (
            <a
              href={`/pages/${initial.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 px-2 text-sm font-semibold text-canopy hover:underline"
            >
              View <ExternalLink className="size-4" />
            </a>
          )}
        </div>
        {values.id && (
          <Panel title="Delete page" description="Links to this page will stop working.">
            <ConfirmButton
              confirmLabel="Click again to delete"
              disabled={pending}
              onConfirm={() =>
                startTransition(async () => {
                  const result = await deletePage(values.id!);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(result.message ?? "Deleted");
                  router.push("/admin/pages");
                })
              }
            >
              Delete page
            </ConfirmButton>
          </Panel>
        )}
      </div>
    </form>
  );
}
