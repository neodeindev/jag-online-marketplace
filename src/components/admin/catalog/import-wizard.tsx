"use client";

import { CheckCircle2, Download, FileSpreadsheet, Loader2, RotateCcw, TriangleAlert, Upload, XCircle } from "lucide-react";
import Papa from "papaparse";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { findExistingSkus, importProductChunk, type ImportRowResult } from "@/app/admin/products/import/actions";
import {
  CSV_COLUMNS,
  missingForNewProduct,
  normalizeHeader,
  rowToImportPayload,
  templateCsv,
  type ImportPayload,
} from "@/lib/admin/product-csv";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Pill, Table, Td, Th } from "@/components/admin/ui";
import { Button, ButtonLink } from "@/components/ui/button";

interface PreviewRow {
  /** Line number in the spreadsheet (the header is line 1). */
  line: number;
  payload: ImportPayload;
  errors: string[];
  action: "create" | "update";
}

type Phase =
  | { step: "choose" }
  | { step: "checking"; fileName: string }
  | { step: "preview"; fileName: string; rows: PreviewRow[]; unknownColumns: string[] }
  | { step: "importing"; fileName: string; done: number; total: number }
  | { step: "done"; fileName: string; results: (ImportRowResult & { line: number })[]; skipped: number };

const MAX_ROWS = 5000;
const CHUNK = 100;

function download(name: string, content: string) {
  const blob = new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportWizard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ step: "choose" });
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      toast.error("Choose a .csv file. In Excel or Google Sheets, use File › Download / Save as › CSV.");
      return;
    }
    setPhase({ step: "checking", fileName: file.name });

    const parsed = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) =>
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: normalizeHeader,
        complete: resolve,
        error: reject,
      }),
    ).catch(() => null);

    if (!parsed) {
      toast.error("That file couldn't be read as a CSV.");
      setPhase({ step: "choose" });
      return;
    }
    const fields = parsed.meta.fields ?? [];
    if (!fields.includes("sku") && !fields.includes("title")) {
      toast.error("The file needs a header row with at least a “sku” or “title” column. Download the template to see the format.");
      setPhase({ step: "choose" });
      return;
    }
    if (parsed.data.length === 0) {
      toast.error("The file has a header but no product rows.");
      setPhase({ step: "choose" });
      return;
    }
    if (parsed.data.length > MAX_ROWS) {
      toast.error(`Import up to ${MAX_ROWS.toLocaleString()} rows at a time. Split the file and try again.`);
      setPhase({ step: "choose" });
      return;
    }

    const known = new Set<string>(CSV_COLUMNS);
    const unknownColumns = fields.filter((f) => f && !known.has(f));
    const rows = parsed.data.map((raw, index) => {
      const { payload, errors } = rowToImportPayload(raw);
      return { line: index + 2, payload, errors };
    });

    const skus = rows.map((r) => r.payload.sku).filter((s): s is string => Boolean(s));
    let existing = new Set<string>();
    if (skus.length) {
      const found = await findExistingSkus(skus);
      if (!found.ok) {
        toast.error(found.error);
        setPhase({ step: "choose" });
        return;
      }
      existing = new Set(found.data);
    }

    const seen = new Map<string, number>();
    const preview: PreviewRow[] = rows.map((r) => {
      const sku = r.payload.sku?.toLowerCase();
      const action = sku && existing.has(sku) ? "update" : "create";
      const errors = [...r.errors];
      if (action === "create") errors.push(...missingForNewProduct(r.payload));
      if (sku) {
        if (seen.has(sku)) errors.push(`Same SKU as line ${seen.get(sku)}.`);
        else seen.set(sku, r.line);
      }
      return { ...r, errors, action };
    });

    setPhase({ step: "preview", fileName: file.name, rows: preview, unknownColumns });
  }

  async function runImport(fileName: string, rows: PreviewRow[]) {
    const valid = rows.filter((r) => r.errors.length === 0);
    const skipped = rows.length - valid.length;
    const results: (ImportRowResult & { line: number })[] = [];
    setPhase({ step: "importing", fileName, done: 0, total: valid.length });

    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      const outcome = await importProductChunk(chunk.map((r) => r.payload));
      if (!outcome.ok) {
        for (const r of chunk) {
          results.push({ line: r.line, row: 0, sku: r.payload.sku ?? null, status: "error", message: outcome.error });
        }
      } else {
        for (const result of outcome.data) {
          const source = chunk[result.row - 1];
          results.push({ ...result, line: source?.line ?? 0 });
        }
      }
      setPhase({ step: "importing", fileName, done: Math.min(valid.length, i + CHUNK), total: valid.length });
    }

    const created = results.filter((r) => r.status === "created").length;
    const updated = results.filter((r) => r.status === "updated").length;
    if (created + updated > 0) toast.success(`Imported ${created} new and updated ${updated} products`);
    else toast.error("No products were imported. See the errors below.");
    setPhase({ step: "done", fileName, results, skipped });
  }

  const reset = () => setPhase({ step: "choose" });

  if (phase.step === "choose" || phase.step === "checking") {
    return (
      <div className="space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
          className={cn(
            "flex flex-col items-center rounded-2xl border-2 border-dashed bg-white px-6 py-14 text-center transition",
            dragging ? "border-canopy bg-canopy-50" : "border-line-strong",
          )}
        >
          {phase.step === "checking" ? (
            <>
              <Loader2 className="mb-3 size-9 animate-spin text-canopy" />
              <p className="font-bold text-ink">Checking {phase.fileName}…</p>
            </>
          ) : (
            <>
              <FileSpreadsheet className="mb-3 size-10 text-subtle" />
              <p className="font-bold text-ink">Drop a CSV file here</p>
              <p className="mt-1 text-sm text-muted">You&apos;ll see a preview before anything changes.</p>
              <Button className="mt-5" onClick={() => inputRef.current?.click()}>
                <Upload className="size-4" /> Choose file
              </Button>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-bold text-ink">Start from a template</h2>
            <p className="mt-1 text-[13.5px] text-muted">
              A sample file with every column and two example products. Open it in Excel or Google Sheets, replace the
              examples, and save as CSV.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => download("product-import-template.csv", templateCsv())}>
              <Download className="size-4" /> Download template
            </Button>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-bold text-ink">Update existing products</h2>
            <p className="mt-1 text-[13.5px] text-muted">
              Export your catalog, change prices or stock in the spreadsheet, and import it back. Rows are matched by SKU.
            </p>
            <ButtonLink href="/admin/products/export" variant="outline" size="sm" className="mt-3" prefetch={false}>
              <Download className="size-4" /> Export products
            </ButtonLink>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 text-[13.5px] leading-relaxed text-muted">
          <h2 className="mb-2 font-bold text-ink">How the columns work</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">sku</strong> matches an existing product to update it. Rows with a new or empty SKU
              create products and need a <strong className="text-ink">title</strong> and <strong className="text-ink">price</strong>.
            </li>
            <li>
              <strong className="text-ink">category</strong> is the full path, e.g. <code>Fashion &gt; Women &gt; Dresses</code>.
              Missing categories, brands, sizes and colours are created for you.
            </li>
            <li>
              <strong className="text-ink">attributes</strong>: <code>Size: S|M|L; Colour: Black|Red</code> ·{" "}
              <strong className="text-ink">specifications</strong>: <code>Material: Cotton; Weight: 200 g</code> ·{" "}
              <strong className="text-ink">images</strong>: links separated by <code>|</code>.
            </li>
            <li>
              <strong className="text-ink">status</strong> is <code>active</code> or <code>hidden</code>;{" "}
              <strong className="text-ink">featured</strong> is <code>yes</code> or <code>no</code>.
            </li>
            <li>
              Leave a column out to keep current values. A blank cell also keeps the current value — except{" "}
              <strong className="text-ink">sale_price</strong>, <strong className="text-ink">brand</strong> and{" "}
              <strong className="text-ink">category</strong>, where blank removes it.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  if (phase.step === "preview") {
    const problems = phase.rows.filter((r) => r.errors.length > 0).length;
    const creates = phase.rows.filter((r) => r.errors.length === 0 && r.action === "create").length;
    const updates = phase.rows.filter((r) => r.errors.length === 0 && r.action === "update").length;
    const ready = creates + updates;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5">
          <div>
            <p className="font-bold text-ink">{phase.fileName}</p>
            <p className="mt-0.5 flex flex-wrap gap-2 text-[13.5px] text-muted">
              <Pill tone="good">{creates} new</Pill>
              <Pill tone="neutral">{updates} updates</Pill>
              {problems > 0 && <Pill tone="bad">{problems} with problems — will be skipped</Pill>}
            </p>
            {phase.unknownColumns.length > 0 && (
              <p className="mt-2 text-[13px] text-muted">
                Ignoring unknown columns: {phase.unknownColumns.map((c) => `“${c}”`).join(", ")}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reset}>
              Choose another file
            </Button>
            <Button onClick={() => void runImport(phase.fileName, phase.rows)} disabled={ready === 0}>
              <Upload className="size-4" /> Import {ready} {ready === 1 ? "row" : "rows"}
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <thead className="sticky top-0 z-10">
                <tr>
                  <Th>Line</Th>
                  <Th>SKU</Th>
                  <Th>Title</Th>
                  <Th className="text-right">Price</Th>
                  <Th className="text-right">Stock</Th>
                  <Th>Action</Th>
                  <Th>Problems</Th>
                </tr>
              </thead>
              <tbody>
                {phase.rows.map((r) => (
                  <tr key={r.line} className={cn(r.errors.length > 0 && "bg-flag-50/50")}>
                    <Td className="tabular-nums text-muted">{r.line}</Td>
                    <Td className="font-mono text-[12.5px]">{r.payload.sku ?? <span className="text-subtle">auto</span>}</Td>
                    <Td className="max-w-72">
                      <span className="line-clamp-1">{r.payload.title ?? <span className="text-subtle">unchanged</span>}</span>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {r.payload.price !== undefined ? formatPrice(r.payload.price) : <span className="text-subtle">—</span>}
                    </Td>
                    <Td className="text-right tabular-nums">{r.payload.stock ?? <span className="text-subtle">—</span>}</Td>
                    <Td>{r.action === "create" ? <Pill tone="good">New</Pill> : <Pill>Update</Pill>}</Td>
                    <Td className="text-[13px] text-flag-600">{r.errors.join(" ")}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  if (phase.step === "importing") {
    const pct = phase.total ? Math.round((phase.done / phase.total) * 100) : 100;
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <Loader2 className="mx-auto mb-3 size-9 animate-spin text-canopy" />
        <p className="font-bold text-ink">
          Importing {phase.done} of {phase.total}…
        </p>
        <p className="mt-1 text-sm text-muted">Keep this page open until it finishes.</p>
        <div className="mx-auto mt-5 h-2 max-w-md overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-canopy transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  const created = phase.results.filter((r) => r.status === "created").length;
  const updated = phase.results.filter((r) => r.status === "updated").length;
  const failed = phase.results.filter((r) => r.status === "error");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center gap-3">
          {failed.length === 0 ? (
            <CheckCircle2 className="size-9 text-canopy" />
          ) : (
            <TriangleAlert className="size-9 text-gold-600" />
          )}
          <div>
            <p className="font-bold text-ink">Import finished</p>
            <p className="mt-0.5 flex flex-wrap gap-2">
              <Pill tone="good">{created} created</Pill>
              <Pill>{updated} updated</Pill>
              {failed.length > 0 && <Pill tone="bad">{failed.length} failed</Pill>}
              {phase.skipped > 0 && <Pill tone="warn">{phase.skipped} skipped</Pill>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="size-4" /> Import another file
          </Button>
          <ButtonLink href="/admin/products">View products</ButtonLink>
        </div>
      </div>
      {failed.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <p className="border-b border-line px-5 py-3 text-[14px] font-bold text-ink">Rows that failed</p>
          <Table>
            <thead>
              <tr>
                <Th>Line</Th>
                <Th>SKU</Th>
                <Th>What went wrong</Th>
              </tr>
            </thead>
            <tbody>
              {failed.map((r, i) => (
                <tr key={`${r.line}-${i}`}>
                  <Td className="tabular-nums text-muted">{r.line || "—"}</Td>
                  <Td className="font-mono text-[12.5px]">{r.sku ?? "—"}</Td>
                  <Td className="text-[13px] text-flag-600">
                    <XCircle className="mr-1 inline size-4 align-[-3px]" />
                    {r.message ?? "Couldn't import this row."}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
