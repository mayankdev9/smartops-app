"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Step } from "react-joyride";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  MessageCircle,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { autoDetectMapping, FIELDS, isMappingValid, type FieldKey, type Mapping } from "@/lib/mapping";
import { businessHealth, computeDashboard } from "@/lib/analytics";
import { buildUnionMapping, classifyFile, describeSource, type FileKind } from "@/lib/mergeUpload";
import { UploadSession, type ParsedMeta } from "@/lib/uploadSession";
import { useSession } from "next-auth/react";
import { useDashboardData, useDataStore } from "@/lib/store";
import ProductTour from "@/components/ProductTour";
import { useTourStore } from "@/lib/tourStore";

const STEPS = ["Business", "Connect data", "Diagnosis"];
const CURRENCIES = ["₹", "$", "€", "£"];
const CONCERNS = [
  "Running out of stock",
  "Slow-moving stock / cash stuck",
  "Too many returns",
  "Not knowing what's selling",
  "Cash flow",
  "Not sure yet",
];
const HEALTH_STYLES = {
  good: { bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  warn: { bg: "bg-amber-50", ring: "ring-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  urgent: { bg: "bg-red-50", ring: "ring-red-200", text: "text-red-700", dot: "bg-red-500" },
} as const;
const KIND_STYLES: Record<FileKind, { label: string; className: string }> = {
  sales: { label: "Sales data", className: "bg-blue-50 text-brand" },
  inventory: { label: "Inventory data", className: "bg-purple-50 text-purple-700" },
  unknown: { label: "Type unclear", className: "bg-slate-100 text-slate-500" },
};

function isSpreadsheet(name: string): boolean {
  return /\.(xlsx|xls|csv)$/i.test(name);
}

interface FileEntry {
  id: string;
  fileName: string;
  parsed: ParsedMeta | null;
  mapping: Mapping;
  parsing: boolean;
  error: string | null;
  expanded: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const setData = useDataStore((s) => s.setData);
  const { data: session } = useSession();
  const me = session?.user;
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [combining, setCombining] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("₹");
  const [concern, setConcern] = useState("");
  const sessionsRef = useRef<Map<string, UploadSession>>(new Map());
  const d = useDashboardData();
  const health = businessHealth(d);
  const healthStyle = HEALTH_STYLES[health.tone];

  // Tear down every file's worker when leaving the page.
  useEffect(
    () => () => {
      sessionsRef.current.forEach((s) => s.dispose());
      sessionsRef.current.clear();
    },
    [],
  );

  // Interactive upload tour: auto-runs once, the first time a user reaches
  // this step (desktop only — the mapping UI is dense and the mobile sidebar
  // drawer/nav-tour steps are out of scope for v1).
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => setIsDesktop(window.innerWidth >= 768), []);
  const hasSeenUploadTour = useTourStore((s) => s.hasSeenUploadTour);
  const markUploadTourSeen = useTourStore((s) => s.markUploadTourSeen);
  const runUploadTour = isDesktop && step === 1 && !hasSeenUploadTour;
  const uploadTourSteps: Step[] = [
    { target: '[data-tour="upload-select"]', content: "Select one or more sales/inventory files — .xlsx or .csv." },
    { target: '[data-tour="upload-folder"]', content: "Or select a whole folder — we'll pick out the spreadsheets and combine them into one dashboard." },
  ];

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    const picked = Array.from(fileList).filter((f) => isSpreadsheet(f.name));
    if (picked.length === 0) return;
    setGlobalError(null);

    const entries: FileEntry[] = picked.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: file.name,
      parsed: null,
      mapping: {},
      parsing: true,
      error: null,
      expanded: false,
    }));
    setFiles((prev) => [...prev, ...entries]);

    await Promise.all(
      picked.map(async (file, i) => {
        const id = entries[i].id;
        const uploadSession = new UploadSession();
        sessionsRef.current.set(id, uploadSession);
        try {
          const meta = await uploadSession.parse(file);
          const mapping = autoDetectMapping(meta.columns);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, parsed: meta, mapping, parsing: false, expanded: !isMappingValid(mapping) } : f,
            ),
          );
        } catch (err) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? { ...f, parsing: false, expanded: true, error: err instanceof Error ? err.message : "Could not read that file." }
                : f,
            ),
          );
        }
      }),
    );
  }

  function removeFile(id: string) {
    sessionsRef.current.get(id)?.dispose();
    sessionsRef.current.delete(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function updateMapping(id: string, key: FieldKey, value: string) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, mapping: { ...f.mapping, [key]: value || undefined } } : f)));
  }

  function toggleExpanded(id: string) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, expanded: !f.expanded } : f)));
  }

  const validFiles = files.filter((f) => f.parsed && isMappingValid(f.mapping));
  const anyParsing = files.some((f) => f.parsing);
  const allValid = files.length > 0 && validFiles.length === files.length;

  // Normalize every file's rows to canonical field keys, concatenate, and run
  // computeDashboard ONCE over the combined set with a union mapping — the
  // existing analytics engine already handles sales-shaped + inventory-shaped
  // rows for the same product correctly, so no changes needed there.
  async function combine() {
    if (files.length > 0 && allValid) {
      setCombining(true);
      try {
        const perFile = await Promise.all(
          files.map(async (f) => {
            const uploadSession = sessionsRef.current.get(f.id);
            const rows = uploadSession ? await uploadSession.normalize(f.mapping) : [];
            return { rows, mapping: f.mapping };
          }),
        );
        const combinedRows = perFile.flatMap((f) => f.rows);
        const unionMapping = buildUnionMapping(perFile.map((f) => f.mapping));
        const source = describeSource(files.map((f) => f.fileName));
        const data = computeDashboard(combinedRows, unionMapping, currency, source);
        if (me) await setData(me.companyId, data, me.name ?? "a teammate");
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : "Could not process your data.");
        setCombining(false);
        return;
      }
      setCombining(false);
    }
    setStep(2);
  }

  const totalRows = files.reduce((s, f) => s + (f.parsed?.rowCount ?? 0), 0);
  const combineLabel = combining
    ? "Combining your data…"
    : files.length === 0
      ? "Skip — use sample data"
      : allValid
        ? files.length > 1
          ? "Combine & use my data →"
          : "Use my data →"
        : anyParsing
          ? "Reading your files…"
          : "Map required fields to continue";

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3.5">
        <h2 className="text-[15px] font-bold leading-tight text-slate-900">Setup &amp; Data</h2>
        <p className="text-xs leading-tight text-slate-500">Get SmartOps talking to your business data</p>
      </header>

      <div className="mx-auto max-w-2xl p-6">
        {/* Stepper */}
        <div className="mb-6 flex items-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    i < step
                      ? "bg-emerald-500 text-white"
                      : i === step
                        ? "bg-brand text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${i <= step ? "text-slate-800" : "text-slate-400"}`}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-3 h-0.5 flex-1 ${i < step ? "bg-emerald-500" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Set up your data</h3>
              {me && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-sm font-bold text-brand">
                    {me.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{me.companyName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {me.companyType}
                      {me.name ? ` · ${me.name}` : ""}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Signed in
                  </span>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  What&apos;s your biggest operational headache right now?{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CONCERNS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setConcern(concern === c ? "" : c)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        concern === c ? "border-brand bg-blue-50 text-brand" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="mt-2 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Continue to upload
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <ProductTour steps={uploadTourSteps} run={runUploadTour} onFinish={markUploadTourSeen} />
              <h3 className="text-lg font-bold text-slate-900">Connect your data</h3>
              <p className="text-sm text-slate-500">
                SmartOps works with what you already have. Add a sales file, an inventory file, or both — we&apos;ll
                combine them into one dashboard.
              </p>

              {/* Two entry points: pick files, or a whole folder */}
              <div className="grid grid-cols-2 gap-3">
                <label data-tour="upload-select" className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-6 text-center transition hover:border-brand hover:bg-blue-50/40">
                  <Upload size={24} className="mb-1.5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Select files</span>
                  <span className="mt-0.5 text-xs text-slate-400">.xlsx or .csv, one or more</span>
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <label data-tour="upload-folder" className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-6 text-center transition hover:border-brand hover:bg-blue-50/40">
                  <FolderOpen size={24} className="mb-1.5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Select a folder</span>
                  <span className="mt-0.5 text-xs text-slate-400">We&apos;ll pick out the spreadsheets</span>
                  <input
                    type="file"
                    multiple
                    // Non-standard attributes, supported by Chromium/WebKit browsers, for folder selection.
                    // @ts-expect-error -- webkitdirectory/directory aren't in React's input attribute types
                    webkitdirectory=""
                    directory=""
                    className="hidden"
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SourceCard
                  icon={<FileSpreadsheet size={18} className="text-emerald-600" />}
                  title="Excel / CSV"
                  sub={files.length ? `${files.length} file${files.length > 1 ? "s" : ""} · ${totalRows.toLocaleString()} rows` : "Upload above"}
                  active={files.length > 0}
                />
                <SourceCard
                  icon={<MessageCircle size={18} className="text-emerald-600" />}
                  title="WhatsApp orders"
                  sub="Coming soon"
                />
              </div>

              {globalError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{globalError}</span>
                </div>
              )}

              {/* Currency — one shared setting across every file */}
              {files.length > 0 && (
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs text-slate-500">Currency</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* One card per selected file */}
              <div className="space-y-3">
                {files.map((f) => (
                  <FileCard
                    key={f.id}
                    entry={f}
                    onToggle={() => toggleExpanded(f.id)}
                    onRemove={() => removeFile(f.id)}
                    onMappingChange={(key, value) => updateMapping(f.id, key, value)}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(0)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={combine}
                  disabled={combining || anyParsing || (files.length > 0 && !allValid)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40"
                >
                  {(combining || anyParsing) && <Loader2 size={15} className="animate-spin" />}
                  {combineLabel}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                  <Activity size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Here&apos;s what SmartOps found{me ? `, ${me.companyName}` : ""}</h3>
                  <p className="text-sm text-slate-500">
                    {d.isSample
                      ? "Based on sample data — upload your file for a read on your own numbers."
                      : `A first read on ${d.source}.`}
                  </p>
                </div>
              </div>

              {concern && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  You told us your biggest headache is{" "}
                  <span className="font-semibold text-slate-800">{concern.toLowerCase()}</span>. Here&apos;s where
                  that stands, plus what else needs your attention.
                </p>
              )}

              {/* Business health */}
              <div className={`rounded-xl p-4 ring-1 ${healthStyle.bg} ${healthStyle.ring}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${healthStyle.dot}`} />
                  <span className={`text-xs font-bold uppercase tracking-wide ${healthStyle.text}`}>{health.label}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{health.summary}</p>
              </div>

              {/* Findings + recommendations */}
              {d.insights.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-800">What we found, and what to do</p>
                  <div className="space-y-2">
                    {d.insights.map((ins, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-800">{ins.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{ins.detail}</p>
                        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand">
                          <ArrowRight size={12} /> {ins.action}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  See full dashboard
                </button>
                <button
                  onClick={() => router.push("/assistant")}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <Sparkles size={15} /> Ask the assistant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceCard({
  icon,
  title,
  sub,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        active ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-slate-800">{title}</span>
      </div>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function FileCard({
  entry,
  onToggle,
  onRemove,
  onMappingChange,
}: {
  entry: FileEntry;
  onToggle: () => void;
  onRemove: () => void;
  onMappingChange: (key: FieldKey, value: string) => void;
}) {
  const valid = entry.parsed ? isMappingValid(entry.mapping) : false;
  const kind = entry.parsed ? classifyFile(entry.fileName, entry.mapping) : null;

  return (
    <div className={`rounded-xl border ${valid || entry.parsing ? "border-slate-200" : "border-red-200"} bg-white`}>
      {/* A plain div (not a <button>) so the "remove" button below can be a real,
          independently-clickable <button> — nesting interactive elements inside
          a <button> is invalid HTML and behaves inconsistently across browsers. */}
      <div
        onClick={entry.parsing ? undefined : onToggle}
        className={`flex w-full items-center gap-2.5 px-4 py-3 text-left ${entry.parsing ? "" : "cursor-pointer"}`}
      >
        {entry.parsing ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-brand" />
        ) : entry.error ? (
          <AlertCircle size={16} className="shrink-0 text-red-500" />
        ) : (
          <FileSpreadsheet size={16} className="shrink-0 text-emerald-600" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{entry.fileName}</span>
        {entry.parsed && (
          <span className="shrink-0 text-xs text-slate-400">{entry.parsed.rowCount.toLocaleString()} rows</span>
        )}
        {kind && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${KIND_STYLES[kind].className}`}>
            {KIND_STYLES[kind].label}
          </span>
        )}
        {!valid && !entry.parsing && !entry.error && (
          <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
            Needs mapping
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${entry.fileName}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={14} />
        </button>
        {entry.parsed && (
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${entry.expanded ? "rotate-180" : ""}`} />
        )}
      </div>

      {entry.error && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-2.5 text-xs text-red-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{entry.error}</span>
        </div>
      )}

      {entry.expanded && entry.parsed && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {entry.parsed.columns.slice(0, 8).map((c) => (
              <span key={c} className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                {c}
              </span>
            ))}
            {entry.parsed.columns.length > 8 && (
              <span className="px-1 text-xs text-slate-400">+{entry.parsed.columns.length - 8} more</span>
            )}
          </div>

          <div className="space-y-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <div className="w-36 shrink-0">
                  <span className="text-xs font-medium text-slate-700">{f.label}</span>
                  {f.required && <span className="ml-1 text-red-500">*</span>}
                </div>
                <select
                  value={entry.mapping[f.key] ?? ""}
                  onChange={(e) => onMappingChange(f.key, e.target.value)}
                  className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:border-brand ${
                    f.required && !entry.mapping[f.key] ? "border-red-300 bg-red-50/40" : "border-slate-300"
                  }`}
                >
                  <option value="">— not in this file —</option>
                  {entry.parsed!.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {!valid && (
            <p className="text-xs text-red-600">Map the required fields (Product &amp; Units sold) to include this file.</p>
          )}
        </div>
      )}
    </div>
  );
}
