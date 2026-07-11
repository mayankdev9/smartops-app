// Turns uploaded rows + a column mapping into the same shapes the Dashboard
// renders. This is what makes an uploaded file actually drive the app.

import type { Insight, SlowMover, StockoutRisk } from "./data";
import type { Mapping } from "./mapping";

export interface KpiCard {
  icon: "revenue" | "units" | "frozen" | "risk";
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "warn" | "default";
}

export interface DashboardData {
  source: string; // "Sample data" or the uploaded file name
  isSample: boolean;
  currency: string; // prefix like "₹", "$"
  kpiCards: KpiCard[];
  insights: Insight[];
  abcBreakdown: { name: string; skus: number; revenuePct: number; color: string }[];
  topSkus: { sku: string; units: number }[];
  stockoutRisks: StockoutRisk[];
  slowMovers: SlowMover[];
  revenueTrend: { day: string; revenue: number }[]; // empty when the file has no dates
}

const ABC_COLORS = ["#1d4ed8", "#60a5fa", "#cbd5e1"];

interface Item {
  name: string;
  sold: number;
  onHand: number;
  price: number;
  cost: number;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(currency: string, n: number): string {
  return `${currency}${Math.round(n).toLocaleString()}`;
}

/** Aggregate rows by product (handles both transaction logs and inventory snapshots). */
function toItems(rows: Record<string, unknown>[], m: Mapping): Item[] {
  const byName = new Map<string, Item>();
  for (const row of rows) {
    const name = String(row[m.product as string] ?? "").trim();
    if (!name) continue;
    const sold = m.unitsSold ? toNum(row[m.unitsSold]) : 0;
    const onHand = m.onHand ? toNum(row[m.onHand]) : 0;
    const price = m.price ? toNum(row[m.price]) : 0;
    const cost = m.cost ? toNum(row[m.cost]) : 0;

    const existing = byName.get(name);
    if (existing) {
      existing.sold += sold;
      existing.onHand = Math.max(existing.onHand, onHand);
      existing.price = Math.max(existing.price, price);
      existing.cost = Math.max(existing.cost, cost);
    } else {
      byName.set(name, { name, sold, onHand, price, cost });
    }
  }
  return [...byName.values()];
}

export function computeDashboard(
  rows: Record<string, unknown>[],
  mapping: Mapping,
  currency: string,
  fileName: string,
): DashboardData {
  const items = toItems(rows, mapping);
  const hasPrice = !!mapping.price;
  const hasOnHand = !!mapping.onHand;
  const hasCost = !!mapping.cost;

  const totalUnits = items.reduce((s, i) => s + i.sold, 0);
  const totalRevenue = items.reduce((s, i) => s + i.sold * i.price, 0);

  // Top SKUs by units sold
  const topSkus = [...items]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)
    .map((i) => ({ sku: i.name, units: Math.round(i.sold) }));

  // ABC by revenue contribution
  const byRev = [...items].sort((a, b) => b.sold * b.price - a.sold * a.price);
  const cutoffs = { A: 0.7, B: 0.9 };
  let cum = 0;
  const classCount = { A: 0, B: 0, C: 0 };
  const classRev = { A: 0, B: 0, C: 0 };
  for (const i of byRev) {
    const rev = i.sold * i.price;
    const share = totalRevenue > 0 ? cum / totalRevenue : 0;
    const cls = share < cutoffs.A ? "A" : share < cutoffs.B ? "B" : "C";
    classCount[cls]++;
    classRev[cls] += rev;
    cum += rev;
  }
  const abcBreakdown = (["A", "B", "C"] as const).map((c, idx) => ({
    name: `Class ${c}`,
    skus: classCount[c],
    revenuePct: totalRevenue > 0 ? Math.round((classRev[c] / totalRevenue) * 100) : 0,
    color: ABC_COLORS[idx],
  }));

  // Stockout risk: needs on-hand. Approx daily sales = sold / 30 days.
  const stockoutRisks: StockoutRisk[] = hasOnHand
    ? items
        .filter((i) => i.onHand > 0 && i.sold > 0)
        .map((i) => {
          const dailySales = i.sold / 30;
          return {
            sku: i.name,
            onHand: Math.round(i.onHand),
            dailySales: Math.round(dailySales * 10) / 10,
            daysLeft: Math.round((i.onHand / dailySales) * 10) / 10,
            reorder: Math.ceil(dailySales * 14),
          };
        })
        .filter((r) => r.daysLeft <= 10)
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5)
    : [];

  // Slow-movers: lowest sales with capital tied up in stock.
  const unitValue = (i: Item) => (hasCost ? i.cost : i.price);
  const slowItems = hasOnHand
    ? [...items].filter((i) => i.onHand > 0).sort((a, b) => a.sold - b.sold).slice(0, 4)
    : [];

  const slowMovers: SlowMover[] = slowItems.map((i) => ({
    sku: i.name,
    units: Math.round(i.onHand),
    value: money(currency, i.onHand * unitValue(i)),
    daysIdle: 0, // no date column → unknown; UI shows "low sales" instead
  }));

  const frozenCapitalNum = slowItems.reduce((s, i) => s + i.onHand * unitValue(i), 0);

  // KPI cards
  const kpiCards: KpiCard[] = [
    {
      icon: "revenue",
      label: "Revenue",
      value: hasPrice ? money(currency, totalRevenue) : "—",
      sub: hasPrice ? "from your uploaded data" : "add a price column",
      tone: "default",
    },
    {
      icon: "units",
      label: "Units Sold",
      value: Math.round(totalUnits).toLocaleString(),
      sub: `across ${items.length} SKUs`,
    },
    {
      icon: "frozen",
      label: "Capital in Stock",
      value: hasOnHand && (hasPrice || hasCost) ? money(currency, frozenCapitalNum) : "—",
      sub: hasOnHand ? "tied up in slow-movers" : "add a stock column",
      tone: "warn",
    },
    {
      icon: "risk",
      label: "Stockout Risk",
      value: hasOnHand ? `${stockoutRisks.length} SKUs` : "—",
      sub: hasOnHand ? "need reorder soon" : "add a stock column",
      tone: "warn",
    },
  ];

  // Insights derived from the computed data
  const insights: Insight[] = [];
  if (stockoutRisks[0]) {
    insights.push({
      tone: "urgent",
      title: `${stockoutRisks[0].sku} runs out in ${stockoutRisks[0].daysLeft} days`,
      detail: `Selling ~${stockoutRisks[0].dailySales}/day with ${stockoutRisks[0].onHand} on hand.`,
      action: `Reorder ${stockoutRisks[0].reorder} units soon`,
    });
  }
  if (slowMovers[0]) {
    insights.push({
      tone: "warn",
      title: `${slowMovers[0].sku} is your slowest mover`,
      detail: `${slowMovers[0].units} units (${slowMovers[0].value}) sitting with the least sales.`,
      action: "Consider a clearance to free cash",
    });
  }
  if (topSkus[0]) {
    insights.push({
      tone: "good",
      title: `${topSkus[0].sku} is your top seller`,
      detail: `${topSkus[0].units.toLocaleString()} units — ${
        abcBreakdown[0].skus
      } Class-A SKUs drive ${abcBreakdown[0].revenuePct}% of revenue.`,
      action: "Protect its availability",
    });
  }

  return {
    source: fileName,
    isSample: false,
    currency,
    kpiCards,
    insights,
    abcBreakdown,
    topSkus,
    stockoutRisks,
    slowMovers,
    revenueTrend: [], // no date column → no trend
  };
}
