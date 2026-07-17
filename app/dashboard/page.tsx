"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertTriangle, ArrowRight, ChevronRight, Database, FileSpreadsheet, FileText, Package, RefreshCw, Snowflake, Sparkles, TrendingUp, Upload } from "lucide-react";
import type { Insight } from "@/lib/data";
import { businessHealth, type KpiCard as KpiCardData } from "@/lib/analytics";
import { useDashboardData, useDataStore } from "@/lib/store";
import { useCurrentCompany } from "@/lib/authStore";
import { exportExcel, exportPdf } from "@/lib/export";
import SkuDrawer, { type SkuDetail } from "@/components/SkuDrawer";

const HEALTH_STYLES: Record<"good" | "warn" | "urgent", { bg: string; ring: string; text: string; dot: string }> = {
  good: { bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  warn: { bg: "bg-amber-50", ring: "ring-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  urgent: { bg: "bg-red-50", ring: "ring-red-200", text: "text-red-700", dot: "bg-red-500" },
};

const INSIGHT_STYLES: Record<Insight["tone"], { bar: string; chip: string; icon: React.ReactNode }> = {
  urgent: { bar: "border-l-red-500", chip: "bg-red-50 text-red-700", icon: <AlertTriangle size={15} /> },
  warn: { bar: "border-l-amber-500", chip: "bg-amber-50 text-amber-700", icon: <Snowflake size={15} /> },
  good: { bar: "border-l-emerald-500", chip: "bg-emerald-50 text-emerald-700", icon: <TrendingUp size={15} /> },
};

const KPI_ICONS: Record<KpiCardData["icon"], React.ReactNode> = {
  revenue: <TrendingUp size={16} />,
  units: <Package size={16} />,
  frozen: <Snowflake size={16} />,
  risk: <AlertTriangle size={16} />,
};

// Compact currency for chart axes/tooltips (₹1,27,00,000 → ₹1.3Cr, $1.2M).
function compact(currency: string, n: number): string {
  const abs = Math.abs(n);
  if (currency === "₹") {
    if (abs >= 1e7) return `${currency}${(n / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
    if (abs >= 1e5) return `${currency}${(n / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
    if (abs >= 1e3) return `${currency}${Math.round(n / 1e3)}K`;
    return `${currency}${Math.round(n)}`;
  }
  if (abs >= 1e9) return `${currency}${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${currency}${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${currency}${Math.round(n / 1e3)}K`;
  return `${currency}${Math.round(n)}`;
}

function InsightCard({ insight }: { insight: Insight }) {
  const s = INSIGHT_STYLES[insight.tone];
  return (
    <div className={`rounded-xl border border-l-4 border-slate-200 bg-white p-4 ${s.bar}`}>
      <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${s.chip}`}>
        {s.icon}
        {insight.tone === "urgent" ? "Act now" : insight.tone === "warn" ? "Watch" : "Good news"}
      </div>
      <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{insight.detail}</p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand">
        <ArrowRight size={13} /> {insight.action}
      </p>
    </div>
  );
}

function KpiCard({ card }: { card: KpiCardData }) {
  const subColor =
    card.tone === "up" ? "text-emerald-600" : card.tone === "warn" ? "text-amber-600" : "text-slate-400";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        {KPI_ICONS[card.icon]}
        <span className="text-xs font-medium text-slate-500">{card.label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{card.value}</div>
      {card.sub && <div className={`mt-0.5 text-xs font-medium ${subColor}`}>{card.sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const d = useDashboardData();
  const clearData = useDataStore((s) => s.clear);
  const company = useCurrentCompany();
  const clear = () => company && clearData(company.id);
  const [selectedSku, setSelectedSku] = useState<SkuDetail | null>(null);
  const health = businessHealth(d);
  const hs = HEALTH_STYLES[health.tone];
  const topAction = d.insights.find((i) => i.tone === "urgent") ?? d.insights[0];

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
        <div>
          <h2 className="text-[15px] font-bold leading-tight text-slate-900">Dashboard</h2>
          <p className="text-xs leading-tight text-slate-500">Your operations at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-slate-400 sm:inline">Export</span>
          <button
            onClick={() => exportExcel(d)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-emerald-600"
            title="Download Excel report (.xlsx)"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={() => exportPdf(d)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-red-600"
            title="Download PDF report"
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 p-6">
        {/* Business health — big picture first */}
        <div className={`rounded-2xl ${hs.bg} p-5 ring-1 ${hs.ring}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white ${hs.text}`}>
                <Activity size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${hs.dot}`} />
                  <span className={`text-xs font-bold uppercase tracking-wide ${hs.text}`}>{health.label}</span>
                </div>
                <p className="text-lg font-bold leading-tight text-slate-900">Business health</p>
                <p className="text-sm text-slate-600">{health.summary}</p>
              </div>
            </div>
            {topAction && (
              <div className="rounded-xl bg-white/70 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">Top priority</p>
                <p className="text-sm font-semibold text-slate-800">{topAction.title}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand">
                  <ArrowRight size={12} /> {topAction.action}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Data source banner */}
        {d.isSample ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <Database size={15} className="text-brand" />
              Showing <strong className="font-semibold text-slate-800">sample data</strong> — upload your file to see your own numbers.
            </span>
            <Link href="/onboarding" className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
              <Upload size={13} /> Upload data
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <Database size={15} className="text-emerald-600" />
              Showing your data: <strong className="font-semibold text-slate-800">{d.source}</strong>
            </span>
            <button onClick={clear} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
              Reset to sample
            </button>
          </div>
        )}

        {/* Proactive insights */}
        {d.insights.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Sparkles size={16} className="text-brand" />
              Proactive insights
              <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Critic-validated
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {d.insights.map((ins, i) => (
                <InsightCard key={i} insight={ins} />
              ))}
            </div>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {d.kpiCards.map((c, i) => (
            <KpiCard key={i} card={c} />
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="Revenue trend">
              {d.revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={d.revenueTrend} margin={{ left: -8, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                      tickFormatter={(v) => compact(d.currency, Number(v))}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                      formatter={(v) => [compact(d.currency, Number(v)), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] flex-col items-center justify-center text-center text-sm text-slate-400">
                  <TrendingUp size={28} className="mb-2 opacity-40" />
                  Add a date column to your upload to see a revenue trend over time.
                </div>
              )}
            </Card>
          </div>

          <Card title="ABC by revenue">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={d.abcBreakdown} dataKey="revenuePct" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {d.abcBreakdown.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v, _n, p) => [`${v}% rev · ${p.payload.skus} SKUs`, p.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-3">
              {d.abcBreakdown.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                  {c.name}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top SKUs + risk lists (reorder list only when the file carries stock) */}
        <div className={`grid grid-cols-1 gap-4 ${d.hasInventory ? "lg:grid-cols-3" : ""}`}>
          <div className={d.hasInventory ? "lg:col-span-2" : ""}>
            <Card title="Top SKUs by units">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={d.topSkus} layout="vertical" margin={{ left: 40, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="sku" tick={{ fontSize: 11, fill: "#475569" }} width={110} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v) => [`${v} units`, "Sold"]}
                  />
                  <Bar dataKey="units" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {d.hasInventory && (
          <Card title="Reorder now">
            {d.stockoutRisks.length > 0 ? (
              <ul className="space-y-1">
                {d.stockoutRisks.map((s) => (
                  <li key={s.sku}>
                    <button
                      onClick={() =>
                        setSelectedSku({
                          sku: s.sku,
                          context: "Stockout risk",
                          onHand: s.onHand,
                          dailySales: s.dailySales,
                          daysLeft: s.daysLeft,
                          reorder: s.reorder,
                        })
                      }
                      className="-mx-2 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{s.sku}</p>
                        <p className="text-xs text-slate-500">{s.onHand} on hand · {s.dailySales}/day</p>
                      </div>
                      <span className="flex items-center gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.daysLeft < 2.5 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                          {s.daysLeft}d left
                        </span>
                        <ChevronRight size={15} className="text-slate-300" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">No stockout risks detected.</p>
            )}
          </Card>
          )}
        </div>

        {/* Slow-movers (inventory files only) */}
        {d.hasInventory && (
        <Card title="Capital tied up — slow-movers">
          {d.slowMovers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="pb-2 font-medium">SKU</th>
                    <th className="pb-2 font-medium">Units</th>
                    <th className="pb-2 font-medium">Value</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.slowMovers.map((m) => (
                    <tr
                      key={m.sku}
                      onClick={() =>
                        setSelectedSku({
                          sku: m.sku,
                          context: "Slow-mover",
                          units: m.units,
                          value: m.value,
                          note: m.daysIdle > 0 ? `Idle for ${m.daysIdle} days.` : "Among your lowest-selling stock.",
                        })
                      }
                      className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="py-2 font-medium text-slate-800">{m.sku}</td>
                      <td className="py-2 text-slate-600">{m.units}</td>
                      <td className="py-2 text-slate-600">{m.value}</td>
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <RefreshCw size={12} /> {m.daysIdle > 0 ? `${m.daysIdle}d idle` : "low sales"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">No slow-movers detected.</p>
          )}
        </Card>
        )}
      </div>

      <SkuDrawer sku={selectedSku} onClose={() => setSelectedSku(null)} />
    </div>
  );
}
