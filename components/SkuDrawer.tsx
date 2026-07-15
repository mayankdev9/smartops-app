"use client";

import { X } from "lucide-react";

// Detail shown when a user clicks a SKU anywhere on the dashboard/alerts.
export interface SkuDetail {
  sku: string;
  context?: string; // e.g. "Stockout risk" / "Slow-mover"
  onHand?: number;
  dailySales?: number;
  daysLeft?: number;
  reorder?: number;
  units?: number;
  value?: string;
  note?: string;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

export default function SkuDrawer({ sku, onClose }: { sku: SkuDetail | null; onClose: () => void }) {
  if (!sku) return null;

  const urgent = typeof sku.daysLeft === "number" && sku.daysLeft < 2.5;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            {sku.context && (
              <span
                className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  urgent ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {sku.context}
              </span>
            )}
            <h3 className="text-lg font-bold text-slate-900">{sku.sku}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Row label="On hand" value={sku.onHand !== undefined ? `${sku.onHand} units` : undefined} />
          <Row label="Avg daily sales" value={sku.dailySales !== undefined ? `${sku.dailySales}/day` : undefined} />
          <Row
            label="Days of cover left"
            value={
              sku.daysLeft !== undefined ? (
                <span className={urgent ? "text-red-600" : "text-slate-800"}>{sku.daysLeft} days</span>
              ) : undefined
            }
          />
          <Row label="Suggested reorder" value={sku.reorder !== undefined ? `${sku.reorder} units` : undefined} />
          <Row label="Units" value={sku.units} />
          <Row label="Capital tied up" value={sku.value} />
          {sku.note && <p className="mt-3 text-sm text-slate-500">{sku.note}</p>}

          {sku.reorder !== undefined && (
            <button className="mt-5 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
              Generate PO for {sku.reorder} units
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
