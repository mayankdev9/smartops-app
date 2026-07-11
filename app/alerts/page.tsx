"use client";

import { useState } from "react";
import { BadgeCheck, Clock, Mail, MessageCircle } from "lucide-react";
import { business, kpis, stockoutRisks } from "@/lib/data";

type Channel = "whatsapp" | "email";

export default function AlertsPage() {
  const [channel, setChannel] = useState<Channel>("whatsapp");

  const urgent = stockoutRisks[0];

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
        <div>
          <h2 className="text-[15px] font-bold leading-tight text-slate-900">Daily Alert</h2>
          <p className="text-xs leading-tight text-slate-500">Your 8:00 AM operations digest</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          <Clock size={14} /> Sent daily at 8:00 AM
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 p-6 lg:grid-cols-5">
        {/* Preview */}
        <div className="lg:col-span-3">
          {/* Channel toggle */}
          <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setChannel("whatsapp")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                channel === "whatsapp" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MessageCircle size={15} /> WhatsApp
            </button>
            <button
              onClick={() => setChannel("email")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                channel === "email" ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Mail size={15} /> Email
            </button>
          </div>

          {channel === "whatsapp" ? (
            <WhatsAppPreview urgentSku={urgent.sku} urgentDays={urgent.daysLeft} />
          ) : (
            <EmailPreview />
          )}
        </div>

        {/* Delivery settings */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">Delivery settings</h3>
            <div className="space-y-4 text-sm">
              <Row label="Send time" value="8:00 AM daily" />
              <Row label="WhatsApp" value={`+91 ●●●●● ${"12345".slice(-5)}`} on />
              <Row label="Email" value={`owner@sharmatrading.in`} on />
              <Row label="Include" value="Stockouts · KPIs · Top action" />
            </div>
            <div className="mt-5 rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <BadgeCheck size={14} /> Every digest is Critic-validated
              </div>
              <p className="mt-1 text-xs text-emerald-700/80">
                Numbers are checked before the message goes out — no bad data reaches the owner.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, on }: { label: string; value: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-2 font-medium text-slate-800">
        {value}
        {on && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
      </span>
    </div>
  );
}

function WhatsAppPreview({ urgentSku, urgentDays }: { urgentSku: string; urgentDays: number }) {
  return (
    <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      {/* WhatsApp header */}
      <div className="flex items-center gap-3 bg-emerald-600 px-4 py-3 text-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">SO</div>
        <div>
          <p className="text-sm font-semibold">SmartOps</p>
          <p className="text-xs text-emerald-100">Business account</p>
        </div>
      </div>
      {/* Chat area */}
      <div className="space-y-2 bg-[#e5ddd5] p-4" style={{ minHeight: 380 }}>
        <div className="mx-auto w-fit rounded-full bg-white/70 px-3 py-0.5 text-[11px] text-slate-500">
          Today, 8:00 AM
        </div>
        <div className="max-w-[88%] rounded-lg rounded-tl-sm bg-white p-3 text-[13px] leading-relaxed text-slate-800 shadow-sm">
          <p className="font-semibold">☀️ Good morning, {business.name.split(" ")[0]}!</p>
          <p className="mt-1">Here&apos;s your operations summary for today:</p>
          <p className="mt-2 font-semibold text-red-600">🚨 Reorder today</p>
          <p>
            <b>{urgentSku}</b> runs out in <b>{urgentDays} days</b>. Place your order now to avoid weekend
            stockout.
          </p>
          <p className="mt-2 font-semibold text-slate-700">📊 Yesterday</p>
          <p>
            Revenue <b>{kpis.revenue30d}</b> (30d, ↑{kpis.revenueDeltaPct}%) · {kpis.stockoutRiskCount} SKUs
            at risk · turns {kpis.inventoryTurns}×
          </p>
          <p className="mt-2 font-semibold text-slate-700">✅ One thing to do</p>
          <p>Reorder your 3 at-risk SKUs before noon.</p>
          <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-emerald-600">
            <BadgeCheck size={12} /> Critic validated · 8:00 AM
          </div>
        </div>
        <div className="max-w-[88%] rounded-lg rounded-tl-sm bg-white p-3 text-[13px] text-slate-800 shadow-sm">
          Reply <b>&quot;details&quot;</b> for the full stockout list, or ask me anything.
        </div>
      </div>
    </div>
  );
}

function EmailPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <p className="text-xs text-slate-400">From: SmartOps &lt;alerts@smartops.ai&gt;</p>
        <p className="text-sm font-semibold text-slate-900">
          ☀️ Your 8 AM Operations Digest — {kpis.stockoutRiskCount} SKUs need attention
        </p>
      </div>
      <div className="space-y-4 px-5 py-4 text-sm text-slate-700">
        <p>Good morning {business.owner.split(" ")[0]},</p>
        <div className="rounded-lg border border-red-100 bg-red-50 p-3">
          <p className="font-semibold text-red-700">🚨 Reorder today</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {stockoutRisks.map((s) => (
              <li key={s.sku}>
                <b>{s.sku}</b> — {s.daysLeft}d left, reorder {s.reorder} units
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Revenue (30d)" value={kpis.revenue30d} />
          <Metric label="Inventory turns" value={`${kpis.inventoryTurns}×`} />
          <Metric label="Frozen capital" value={kpis.frozenCapital} />
        </div>
        <p className="text-xs text-slate-400">
          <BadgeCheck size={12} className="mr-1 inline" />
          Every figure in this email was Critic-validated before sending.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
