"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileSpreadsheet, MessageCircle, Sparkles, Upload } from "lucide-react";
import { business } from "@/lib/data";

const STEPS = ["Business", "Connect data", "Done"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(business.name);
  const [type, setType] = useState(business.type);
  const [skus, setSkus] = useState(String(business.skuCount));
  const [connected, setConnected] = useState(false);

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

              {/* Excel upload stub */}
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 text-center transition hover:border-brand hover:bg-blue-50/40">
                <Upload size={28} className="mb-2 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Drop your sales &amp; inventory Excel here</span>
                <span className="mt-0.5 text-xs text-slate-400">.xlsx or .csv — we map the columns for you</span>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={() => setConnected(true)}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <SourceCard
                  icon={<FileSpreadsheet size={18} className="text-emerald-600" />}
                  title="Excel / CSV"
                  sub={connected ? "sales_july.xlsx ✓" : "Upload above"}
                  active={connected}
                />
                <SourceCard
                  icon={<MessageCircle size={18} className="text-emerald-600" />}
                  title="WhatsApp orders"
                  sub="Coming soon"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(0)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  {connected ? "Finish setup" : "Skip — use sample data"}
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
                onClick={() => router.push("/")}
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
