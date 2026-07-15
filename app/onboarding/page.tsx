"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, FileSpreadsheet, Loader2, MessageCircle, Sparkles, Upload } from "lucide-react";
import { business } from "@/lib/data";
import { parseUpload, type ParsedUpload } from "@/lib/parseUpload";
import { autoDetectMapping, FIELDS, isMappingValid, type Mapping } from "@/lib/mapping";
import { computeDashboard } from "@/lib/analytics";
import { useDataStore } from "@/lib/store";

const STEPS = ["Business", "Connect data", "Done"];
const CURRENCIES = ["₹", "$", "€", "£"];

export default function OnboardingPage() {
  const router = useRouter();
  const setData = useDataStore((s) => s.setData);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(business.name);
  const [type, setType] = useState(business.type);
  const [skus, setSkus] = useState(String(business.skuCount));
  const [connected, setConnected] = useState(false);
  const [parsed, setParsed] = useState<ParsedUpload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [mapping, setMapping] = useState<Mapping>({});
  const [currency, setCurrency] = useState("₹");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setParseError(null);
    setParsed(null);
    setMapping({});
    try {
      const result = await parseUpload(file);
      setParsed(result);
      setMapping(autoDetectMapping(result.columns));
      setConnected(true);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not read that file.");
      setConnected(false);
    } finally {
      setParsing(false);
      e.target.value = ""; // allow re-selecting the same file
    }
  }

  // Compute the dashboard from the uploaded rows + mapping and store it.
  function finish() {
    if (parsed && isMappingValid(mapping)) {
      setData(computeDashboard(parsed.rows, mapping, currency, parsed.fileName));
    }
    setStep(2);
  }

  const canUseData = !!parsed && isMappingValid(mapping);

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
              <h3 className="text-lg font-bold text-slate-900">Tell us about your business</h3>
              <Field label="Business name" value={name} onChange={setName} />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Business type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"
                >
                  <option>FMCG / General-Trade Distributor</option>
                  <option>Wholesale / Cash &amp; Carry</option>
                  <option>Pharma Distributor</option>
                  <option>Electronics / Hardware Distributor</option>
                </select>
              </div>
              <Field label="Approx. number of SKUs" value={skus} onChange={setSkus} type="number" />
              <button
                onClick={() => setStep(1)}
                className="mt-2 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Continue
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Connect your data</h3>
              <p className="text-sm text-slate-500">
                SmartOps works with what you already have. No new system to learn.
              </p>

              {/* Excel / CSV upload — real client-side parse */}
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 text-center transition hover:border-brand hover:bg-blue-50/40">
                {parsing ? (
                  <Loader2 size={28} className="mb-2 animate-spin text-brand" />
                ) : (
                  <Upload size={28} className="mb-2 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-700">
                  {parsing ? "Reading your file…" : "Drop your sales & inventory file here"}
                </span>
                <span className="mt-0.5 text-xs text-slate-400">.xlsx or .csv — we detect the columns for you</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFile}
                  disabled={parsing}
                />
              </label>

              {parseError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <SourceCard
                  icon={<FileSpreadsheet size={18} className="text-emerald-600" />}
                  title="Excel / CSV"
                  sub={parsed ? `${parsed.fileName} ✓` : "Upload above"}
                  active={!!parsed}
                />
                <SourceCard
                  icon={<MessageCircle size={18} className="text-emerald-600" />}
                  title="WhatsApp orders"
                  sub="Coming soon"
                />
              </div>

              {/* Parsed preview */}
              {parsed && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <Check size={16} className="text-emerald-600" />
                    <span className="font-semibold text-slate-800">
                      {parsed.rowCount.toLocaleString()} rows · {parsed.columns.length} columns detected
                    </span>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {parsed.columns.slice(0, 8).map((c) => (
                      <span key={c} className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        {c}
                      </span>
                    ))}
                    {parsed.columns.length > 8 && (
                      <span className="px-1 text-xs text-slate-400">+{parsed.columns.length - 8} more</span>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          {parsed.columns.slice(0, 6).map((c) => (
                            <th key={c} className="whitespace-nowrap border-b border-slate-100 bg-slate-50 px-2.5 py-1.5 text-left font-semibold text-slate-600">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.preview.map((row, ri) => (
                          <tr key={ri}>
                            {parsed.columns.slice(0, 6).map((c) => (
                              <td key={c} className="whitespace-nowrap border-b border-slate-50 px-2.5 py-1.5 text-slate-600">
                                {String(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Showing first {parsed.preview.length} rows.</p>
                </div>
              )}

              {/* Column mapping — auto-guessed, user can correct */}
              {parsed && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Map your columns</p>
                      <p className="text-xs text-slate-500">We auto-detected these — adjust if needed.</p>
                    </div>
                    <div className="flex items-center gap-1.5">
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
                  </div>
                  <div className="space-y-2.5">
                    {FIELDS.map((f) => (
                      <div key={f.key} className="flex items-center gap-3">
                        <div className="w-40 shrink-0">
                          <span className="text-sm font-medium text-slate-700">{f.label}</span>
                          {f.required && <span className="ml-1 text-red-500">*</span>}
                          <p className="text-[11px] leading-tight text-slate-400">{f.hint}</p>
                        </div>
                        <select
                          value={mapping[f.key] ?? ""}
                          onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand ${
                            f.required && !mapping[f.key] ? "border-red-300 bg-red-50/40" : "border-slate-300"
                          }`}
                        >
                          <option value="">— not in my file —</option>
                          {parsed.columns.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  {!isMappingValid(mapping) && (
                    <p className="mt-3 text-xs text-red-600">
                      Map the required fields (Product & Units sold) to use your data.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(0)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={finish}
                  disabled={!!parsed && !canUseData}
                  className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40"
                >
                  {canUseData ? "Use my data →" : parsed ? "Map required fields to continue" : "Skip — use sample data"}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <Check size={30} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">You&apos;re all set, {name.split(" ")[0]}!</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                SmartOps is analyzing your data. Your first Critic-validated answers and your 8 AM digest
                are ready.
              </p>
              <button
                onClick={() => router.push("/assistant")}
                className="mt-6 flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                <Sparkles size={16} /> Ask your first question
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"
      />
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
