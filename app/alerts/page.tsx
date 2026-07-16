"use client";

import { useState } from "react";
import {
  AlertTriangle, ChevronRight, ClipboardList, CreditCard, Percent, RotateCcw,
  Snowflake, TrendingUp, Truck, X,
} from "lucide-react";
import { useDashboardData } from "@/lib/store";
import {
  buildAlertCategories, priorityCounts, sortByPriority, topPriority,
  type AlertCategory, type CategoryIcon, type Priority,
} from "@/lib/alerts";
import { exportPO } from "@/lib/export";

const ICONS: Record<CategoryIcon, React.ReactNode> = {
  po: <ClipboardList size={22} />,
  stockout: <AlertTriangle size={22} />,
  slow: <Snowflake size={22} />,
  demand: <TrendingUp size={22} />,
  shipping: <Truck size={22} />,
  returns: <RotateCcw size={22} />,
  payments: <CreditCard size={22} />,
  margins: <Percent size={22} />,
};

const P: Record<Priority, { dot: string; chip: string; label: string; accent: string }> = {
  critical: { dot: "bg-red-500", chip: "bg-red-50 text-red-700", label: "Critical", accent: "border-l-red-500" },
  high: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700", label: "High", accent: "border-l-amber-500" },
  normal: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600", label: "Normal", accent: "border-l-slate-300" },
};

function Tile({ cat, onClick }: { cat: AlertCategory; onClick: () => void }) {
  const c = priorityCounts(cat.alerts);
  const tp = topPriority(cat.alerts);
  const empty = cat.alerts.length === 0;
  return (
    <button
      onClick={onClick}
      disabled={empty}
      className={`flex h-full flex-col rounded-xl border border-l-4 border-slate-200 bg-white p-4 text-left transition hover:shadow-md disabled:opacity-60 ${
        empty ? "border-l-slate-200" : P[tp].accent
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {ICONS[cat.icon]}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cat.dataDriven ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {cat.dataDriven ? "from your data" : "sample"}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-900">{cat.name}</p>
      <p className="mt-0.5 text-2xl font-bold text-slate-900">{cat.alerts.length}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {c.critical > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{c.critical} critical</span>}
        {c.high > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{c.high} high</span>}
        {c.critical === 0 && c.high === 0 && <span className="text-[11px] text-slate-400">{empty ? "No alerts" : "All normal"}</span>}
      </div>
      {!empty && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-brand">
          View <ChevronRight size={13} />
        </div>
      )}
    </button>
  );
}

function CategoryDrawer({ cat, currency, onClose }: { cat: AlertCategory; currency: string; onClose: () => void }) {
  void currency;
  const alerts = sortByPriority(cat.alerts);
  const poLines = cat.alerts.filter((a) => a.reorder !== undefined).map((a) => ({ sku: a.sku ?? "SKU", reorder: a.reorder! }));

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{ICONS[cat.icon]}</div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{cat.name}</h3>
              <p className="text-xs text-slate-500">{cat.alerts.length} alert{cat.alerts.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {cat.id === "po" && poLines.length > 0 && (
          <div className="border-b border-slate-100 px-5 py-3">
            <button
              onClick={() => exportPO(poLines)}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Generate PO for all {poLines.length} items
            </button>
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {alerts.map((a) => (
            <div key={a.id} className={`rounded-xl border border-l-4 border-slate-200 bg-white p-3 ${P[a.priority].accent}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${P[a.priority].chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${P[a.priority].dot}`} />
                  {P[a.priority].label}
                </span>
                {a.reorder !== undefined && (
                  <button
                    onClick={() => exportPO([{ sku: a.sku ?? "SKU", reorder: a.reorder! }])}
                    className="rounded-lg border border-brand px-2.5 py-1 text-xs font-semibold text-brand transition hover:bg-blue-50"
                  >
                    Generate PO
                  </button>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-800">{a.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{a.detail}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function AlertsPage() {
  const d = useDashboardData();
  const categories = buildAlertCategories(d);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = categories.find((c) => c.id === openId) ?? null;

  const totalAlerts = categories.reduce((n, c) => n + c.alerts.length, 0);
  const totalCritical = categories.reduce((n, c) => n + priorityCounts(c.alerts).critical, 0);

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
        <div>
          <h2 className="text-[15px] font-bold leading-tight text-slate-900">Alerts</h2>
          <p className="text-xs leading-tight text-slate-500">
            {totalAlerts} alerts across {categories.length} areas
            {totalCritical > 0 ? `, ${totalCritical} critical` : ""}
          </p>
        </div>
        {totalCritical > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            <AlertTriangle size={14} /> {totalCritical} need action now
          </span>
        )}
      </header>

      <div className="mx-auto max-w-5xl p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Tile key={cat.id} cat={cat} onClick={() => setOpenId(cat.id)} />
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Tiles marked “from your data” are computed from your uploaded file; the rest are sample alerts for the prototype.
        </p>
      </div>

      {open && <CategoryDrawer cat={open} currency={d.currency} onClose={() => setOpenId(null)} />}
    </div>
  );
}
