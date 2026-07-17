// Turns uploaded rows + a column mapping into the same shapes the Dashboard
// renders. This is what makes an uploaded file actually drive the app.
//
// Handles two very different file shapes with one code path:
//   1. Inventory snapshot — a row per SKU, with on-hand stock and price.
//   2. Sales / transaction log — a row per order line, with a sales amount and
//      a date (e.g. multi-channel Shopify/Amazon exports). Totals must come from
//      EVERY row (not just rows that carry a SKU code), and the date column
//      powers a revenue trend over time.

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
  hasInventory: boolean; // true when the file carries stock — drives which panels show
  kpiCards: KpiCard[];
  insights: Insight[];
  abcBreakdown: { name: string; skus: number; revenuePct: number; color: string }[];
  topSkus: { sku: string; units: number }[];
  stockoutRisks: StockoutRisk[];
  slowMovers: SlowMover[];
  revenueTrend: { day: string; revenue: number }[]; // empty when the file has no dates
}

const ABC_COLORS = ["#1d4ed8", "#60a5fa", "#cbd5e1"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Overall "business health" for the dashboard hero (big-picture-first).
export function businessHealth(d: DashboardData): {
  label: string;
  tone: "good" | "warn" | "urgent";
  summary: string;
} {
  // Sales-data (no stock) mode: judge health by the revenue trend instead.
  if (!d.hasInventory) {
    const t = d.revenueTrend;
    if (t.length >= 2) {
      const up = t[t.length - 1].revenue >= t[0].revenue;
      return up
        ? { label: "Healthy", tone: "good", summary: "Revenue is trending up over the period in your data." }
        : { label: "Watch", tone: "warn", summary: "Revenue has softened toward the end of the period — worth a look." };
    }
    return { label: "Healthy", tone: "good", summary: "Your sales data is loaded and ready to explore." };
  }

  const critical = d.stockoutRisks.filter((s) => s.daysLeft < 2.5).length;
  const atRisk = d.stockoutRisks.length;
  if (critical > 0) {
    return {
      label: "Action needed",
      tone: "urgent",
      summary: `${critical} SKU${critical > 1 ? "s" : ""} will stock out within days — reorder now.`,
    };
  }
  if (atRisk > 0) {
    return {
      label: "Watch",
      tone: "warn",
      summary: `${atRisk} SKU${atRisk > 1 ? "s" : ""} approaching the reorder point this week.`,
    };
  }
  return { label: "Healthy", tone: "good", summary: "No urgent stock issues — inventory looks well managed." };
}

interface Item {
  name: string;
  sold: number;
  onHand: number;
  price: number;
  cost: number;
  revenue: number; // per-item revenue (from the amount column, or price × units)
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(currency: string, n: number): string {
  return `${currency}${Math.round(n).toLocaleString()}`;
}

// Parse a cell into a Date, tolerating JS Dates (cellDates), Excel serials, and
// ISO / common date strings. Returns null when it isn't a date.
function toDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    // Excel serial date: days since 1899-12-30.
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function monthKey(v: unknown): string | null {
  const d = toDate(v);
  if (!d) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

/** Per-row revenue: the amount column if mapped, else price × units. */
function makeRowRevenue(m: Mapping): (r: Record<string, unknown>) => number {
  if (m.amount) return (r) => toNum(r[m.amount as string]);
  if (m.price) return (r) => toNum(r[m.price as string]) * (m.unitsSold ? toNum(r[m.unitsSold]) : 0);
  return () => 0;
}

/** Aggregate rows by product (handles both transaction logs and inventory snapshots). */
function toItems(rows: Record<string, unknown>[], m: Mapping): Item[] {
  const rowRevenue = makeRowRevenue(m);
  const byName = new Map<string, Item>();
  for (const row of rows) {
    const name = String(row[m.product as string] ?? "").trim();
    if (!name) continue;
    const sold = m.unitsSold ? toNum(row[m.unitsSold]) : 0;
    const onHand = m.onHand ? toNum(row[m.onHand]) : 0;
    const price = m.price ? toNum(row[m.price]) : 0;
    const cost = m.cost ? toNum(row[m.cost]) : 0;
    const revenue = rowRevenue(row);

    const existing = byName.get(name);
    if (existing) {
      existing.sold += sold;
      existing.revenue += revenue;
      existing.onHand = Math.max(existing.onHand, onHand);
      existing.price = Math.max(existing.price, price);
      existing.cost = Math.max(existing.cost, cost);
    } else {
      byName.set(name, { name, sold, onHand, price, cost, revenue });
    }
  }
  return [...byName.values()];
}

// Map our computed dashboard into the businessContext shape Ahmer's backend
// reads (kpiCards / skuBreakdown / revenueTrend / currency). When it's the sample
// (no upload), return {} so the backend answers from its own rich static data.
export function buildBusinessContext(d: DashboardData): Record<string, unknown> {
  if (d.isSample) return {};
  const ctx: Record<string, unknown> = { currency: d.currency };
  ctx.kpiCards = d.kpiCards.map((c) => ({ metric: c.label, value: c.value, note: c.sub ?? "" }));
  if (d.topSkus.length) ctx.skuBreakdown = d.topSkus.map((s) => ({ sku: s.sku, units: s.units }));
  if (d.revenueTrend.length) ctx.revenueTrend = d.revenueTrend;
  return ctx;
}

export function computeDashboard(
  rows: Record<string, unknown>[],
  mapping: Mapping,
  currency: string,
  fileName: string,
): DashboardData {
  const items = toItems(rows, mapping);
  const hasAmount = !!mapping.amount;
  const hasPrice = !!mapping.price;
  const hasOnHand = !!mapping.onHand;
  const hasCost = !!mapping.cost;
  const hasDate = !!mapping.date;
  const hasRevenue = hasAmount || hasPrice;
  const hasInventory = hasOnHand;

  // Totals come from EVERY row, so a sales log with sparse SKU codes still
  // counts all units/revenue (not just the coded subset).
  const rowRevenue = makeRowRevenue(mapping);
  const rowUnits = (r: Record<string, unknown>) => (mapping.unitsSold ? toNum(r[mapping.unitsSold]) : 0);
  const totalUnits = rows.reduce((s, r) => s + rowUnits(r), 0);
  const totalRevenue = rows.reduce((s, r) => s + rowRevenue(r), 0);
  const orderCount = rows.length;
  const aov = orderCount ? totalRevenue / orderCount : 0;

  // Revenue trend from the date column, aggregated by month.
  let revenueTrend: { day: string; revenue: number }[] = [];
  if (hasDate) {
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      const k = monthKey(r[mapping.date as string]);
      if (!k) continue;
      byMonth.set(k, (byMonth.get(k) ?? 0) + (hasRevenue ? rowRevenue(r) : rowUnits(r)));
    }
    revenueTrend = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ day: monthLabel(k), revenue: Math.round(v) }));
  }

  // Top SKUs by units sold
  const topSkus = [...items]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)
    .map((i) => ({ sku: i.name, units: Math.round(i.sold) }));

  // ABC by revenue contribution (across the coded SKUs)
  const skuRevenueTotal = items.reduce((s, i) => s + i.revenue, 0);
  const byRev = [...items].sort((a, b) => b.revenue - a.revenue);
  const cutoffs = { A: 0.7, B: 0.9 };
  let cum = 0;
  const classCount = { A: 0, B: 0, C: 0 };
  const classRev = { A: 0, B: 0, C: 0 };
  for (const i of byRev) {
    const share = skuRevenueTotal > 0 ? cum / skuRevenueTotal : 0;
    const cls = share < cutoffs.A ? "A" : share < cutoffs.B ? "B" : "C";
    classCount[cls]++;
    classRev[cls] += i.revenue;
    cum += i.revenue;
  }
  const abcBreakdown = (["A", "B", "C"] as const).map((c, idx) => ({
    name: `Class ${c}`,
    skus: classCount[c],
    revenuePct: skuRevenueTotal > 0 ? Math.round((classRev[c] / skuRevenueTotal) * 100) : 0,
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

  // KPI cards adapt to the file shape: inventory files show Capital/Stockout,
  // sales files show Orders/Avg Order Value.
  const revenueCard: KpiCard = {
    icon: "revenue",
    label: "Revenue",
    value: hasRevenue ? money(currency, totalRevenue) : "—",
    sub: hasRevenue ? "total in your data" : "add a sales or price column",
    tone: "default",
  };
  const unitsCard: KpiCard = {
    icon: "units",
    label: "Units Sold",
    value: Math.round(totalUnits).toLocaleString(),
    sub: hasInventory ? `across ${items.length} SKUs` : "total quantity",
  };
  const kpiCards: KpiCard[] = hasInventory
    ? [
        revenueCard,
        unitsCard,
        {
          icon: "frozen",
          label: "Capital in Stock",
          value: hasPrice || hasCost ? money(currency, frozenCapitalNum) : "—",
          sub: hasPrice || hasCost ? "tied up in slow-movers" : "add a price column",
          tone: "warn",
        },
        {
          icon: "risk",
          label: "Stockout Risk",
          value: `${stockoutRisks.length} SKUs`,
          sub: "need reorder soon",
          tone: "warn",
        },
      ]
    : [
        revenueCard,
        unitsCard,
        {
          icon: "units",
          label: "Orders",
          value: orderCount.toLocaleString(),
          sub: hasDate ? "in your data" : "rows uploaded",
        },
        {
          icon: "revenue",
          label: "Avg Order Value",
          value: hasRevenue ? money(currency, aov) : "—",
          sub: "revenue per order",
          tone: "default",
        },
      ];

  // Insights derived from the computed data
  const insights: Insight[] = [];
  if (hasInventory) {
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
        detail: `${topSkus[0].units.toLocaleString()} units — ${abcBreakdown[0].skus} Class-A SKUs drive ${abcBreakdown[0].revenuePct}% of revenue.`,
        action: "Protect its availability",
      });
    }
  } else {
    if (hasRevenue) {
      insights.push({
        tone: "good",
        title: `${money(currency, totalRevenue)} across ${orderCount.toLocaleString()} orders`,
        detail: `Average order value ${money(currency, aov)}.`,
        action: "Ask the Assistant for a channel or region breakdown",
      });
    }
    if (revenueTrend.length >= 2) {
      const up = revenueTrend[revenueTrend.length - 1].revenue >= revenueTrend[0].revenue;
      insights.push({
        tone: up ? "good" : "warn",
        title: up ? "Revenue is trending up" : "Revenue is softening",
        detail: `From ${revenueTrend[0].day} to ${revenueTrend[revenueTrend.length - 1].day}.`,
        action: up ? "Keep the momentum going" : "Look into the recent dip",
      });
    }
    if (topSkus[0]) {
      insights.push({
        tone: "good",
        title: `${topSkus[0].sku} leads your coded SKUs`,
        detail: `${topSkus[0].units.toLocaleString()} units sold.`,
        action: "Protect its availability",
      });
    }
  }

  return {
    source: fileName,
    isSample: false,
    currency,
    hasInventory,
    kpiCards,
    insights,
    abcBreakdown,
    topSkus,
    stockoutRisks,
    slowMovers,
    revenueTrend,
  };
}
