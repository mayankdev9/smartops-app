"use client";

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
import { AlertTriangle, Package, RefreshCw, Snowflake, TrendingUp } from "lucide-react";
import {
  abcBreakdown,
  kpis,
  revenueTrend,
  slowMovers,
  stockoutRisks,
  topSkus,
} from "@/lib/data";

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "up" | "warn";
}) {
  const subColor =
    tone === "up" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-slate-400";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className={`mt-0.5 text-xs font-medium ${subColor}`}>{sub}</div>}
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
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3.5">
        <h2 className="text-[15px] font-bold leading-tight text-slate-900">Dashboard</h2>
        <p className="text-xs leading-tight text-slate-500">Your operations at a glance — last 30 days</p>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 p-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            icon={<TrendingUp size={16} />}
            label="Revenue (30d)"
            value={kpis.revenue30d}
            sub={`↑ ${kpis.revenueDeltaPct}% vs prior 30d`}
            tone="up"
          />
          <KpiCard
            icon={<Package size={16} />}
            label="Units Sold"
            value={kpis.unitsSold.toLocaleString()}
            sub={`across ${abcBreakdown.reduce((n, c) => n + c.skus, 0)} SKUs`}
          />
          <KpiCard
            icon={<Snowflake size={16} />}
            label="Frozen Capital"
            value={kpis.frozenCapital}
            sub={`down from ${kpis.frozenCapitalPrev}`}
            tone="up"
          />
          <KpiCard
            icon={<AlertTriangle size={16} />}
            label="Stockout Risk"
            value={`${kpis.stockoutRiskCount} SKUs`}
            sub="need reorder this week"
            tone="warn"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="Revenue trend (₹ thousands / day)">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueTrend} margin={{ left: -20, right: 8, top: 4 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={2} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v) => [`₹${v}k`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card title="ABC by revenue">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={abcBreakdown}
                  dataKey="revenuePct"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {abcBreakdown.map((c) => (
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
              {abcBreakdown.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                  {c.name}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top SKUs + risk lists */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="Top SKUs by units (30d)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topSkus} layout="vertical" margin={{ left: 40, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="sku"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    width={110}
                    tickLine={false}
                    axisLine={false}
                  />
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

          <Card title="Reorder now">
            <ul className="space-y-3">
              {stockoutRisks.map((s) => (
                <li key={s.sku} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.sku}</p>
                    <p className="text-xs text-slate-500">{s.onHand} on hand · {s.dailySales}/day</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      s.daysLeft < 2.5 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {s.daysLeft}d left
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Slow-movers */}
        <Card title="Frozen capital — slow-movers (60+ days idle)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Units</th>
                  <th className="pb-2 font-medium">Value</th>
                  <th className="pb-2 font-medium">Idle</th>
                </tr>
              </thead>
              <tbody>
                {slowMovers.map((m) => (
                  <tr key={m.sku} className="border-t border-slate-100">
                    <td className="py-2 font-medium text-slate-800">{m.sku}</td>
                    <td className="py-2 text-slate-600">{m.units}</td>
                    <td className="py-2 text-slate-600">{m.value}</td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <RefreshCw size={12} /> {m.daysIdle}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
