"use client";

import {
  Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

// Chart JSON returned by Ahmer's backend: { type, title, data: [{name, value}] }.
export interface ChartSpec {
  type: string; // "bar" | "line"
  title: string;
  data: { name: string; value: number }[];
}

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-IN");

const BAR = "#1d4ed8";

export default function AssistantChart({ chart }: { chart: ChartSpec }) {
  if (!chart || !Array.isArray(chart.data) || chart.data.length === 0) return null;
  const isLine = chart.type === "line";
  const rows = isLine ? chart.data : [...chart.data].slice(0, 12);
  const height = isLine ? 210 : Math.max(160, rows.length * 26);

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      {chart.title && <p className="mb-2 text-xs font-semibold text-slate-600">{chart.title}</p>}
      <ResponsiveContainer width="100%" height={height}>
        {isLine ? (
          <LineChart data={rows} margin={{ left: -8, right: 12, top: 4, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => compact.format(v as number)} width={44} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              formatter={(v) => [full.format(v as number), "Value"]}
            />
            <Line type="monotone" dataKey="value" stroke={BAR} strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 2, bottom: 2 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => compact.format(v as number)} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} width={92} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              formatter={(v) => [full.format(v as number), "Value"]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
              {rows.map((_, i) => (
                <Cell key={i} fill={BAR} fillOpacity={1 - i * 0.05} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
