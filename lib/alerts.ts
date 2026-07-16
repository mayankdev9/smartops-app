// Alerts engine — turns the current dashboard data (sample OR uploaded) into
// categorized, prioritized operational alerts for the Alerts hub.
//
// Data-driven categories (Generate PO, Stock-outs, Slow-movers, Fast-movers)
// are derived from the live DashboardData, so they update when a company uploads
// its file. The rest (Shipping, Returns, Payments, Margins) are demo/mock for now
// because the sales data doesn't contain those fields.

import type { DashboardData } from "./analytics";

export type Priority = "critical" | "high" | "normal";

export interface Alert {
  id: string;
  title: string;
  detail: string;
  priority: Priority;
  sku?: string;
  reorder?: number; // present on Generate PO alerts
}

export type CategoryIcon =
  | "po" | "stockout" | "slow" | "demand" | "shipping" | "returns" | "payments" | "margins";

export interface AlertCategory {
  id: string;
  name: string;
  icon: CategoryIcon;
  dataDriven: boolean; // derived from real data vs. sample/mock content
  alerts: Alert[];
}

const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, normal: 2 };

export function sortByPriority(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

export function topPriority(alerts: Alert[]): Priority {
  if (alerts.some((a) => a.priority === "critical")) return "critical";
  if (alerts.some((a) => a.priority === "high")) return "high";
  return "normal";
}

export function priorityCounts(alerts: Alert[]) {
  return {
    critical: alerts.filter((a) => a.priority === "critical").length,
    high: alerts.filter((a) => a.priority === "high").length,
    normal: alerts.filter((a) => a.priority === "normal").length,
  };
}

export function buildAlertCategories(d: DashboardData): AlertCategory[] {
  const cur = d.currency;
  const real = !d.isSample; // uploaded data present

  // --- Generate PO (data-driven from stockout risks) ---
  const poAlerts: Alert[] = d.stockoutRisks.map((s, i) => ({
    id: `po-${i}`,
    title: `Reorder ${s.sku}`,
    detail: `${s.onHand} on hand, ~${s.dailySales}/day. Suggested order: ${s.reorder} units.`,
    priority: s.daysLeft < 2.5 ? "critical" : s.daysLeft < 5 ? "high" : "normal",
    sku: s.sku,
    reorder: s.reorder,
  }));

  // --- Stock-outs (data-driven) ---
  const stockAlerts: Alert[] = d.stockoutRisks.map((s, i) => ({
    id: `so-${i}`,
    title: `${s.sku} runs out in ${s.daysLeft} days`,
    detail: `${s.onHand} units left at ~${s.dailySales}/day of demand.`,
    priority: s.daysLeft < 2.5 ? "critical" : s.daysLeft < 5 ? "high" : "normal",
    sku: s.sku,
  }));

  // --- Slow-movers (data-driven) ---
  const slowAlerts: Alert[] = d.slowMovers.map((m, i) => ({
    id: `sl-${i}`,
    title: `${m.sku} is capital tied up`,
    detail: `${m.units} units (${m.value}) ${m.daysIdle > 0 ? `idle ${m.daysIdle} days` : "with low sales"}.`,
    priority: i === 0 ? "high" : "normal",
    sku: m.sku,
  }));

  // --- Fast-movers / Demand (data-driven) ---
  const demandAlerts: Alert[] = d.topSkus.slice(0, 3).map((s, i) => ({
    id: `dm-${i}`,
    title: `${s.sku} demand is strong`,
    detail: `${s.units.toLocaleString()} units sold — keep it well stocked to avoid missed sales.`,
    priority: i === 0 ? "high" : "normal",
    sku: s.sku,
  }));

  // --- Mock categories (sales data lacks these fields) ---
  const shippingAlerts: Alert[] = [
    { id: "sh-0", title: "Inbound shipment delayed", detail: `PO #4821 from supplier is 3 days late; affects 2 fast-moving SKUs.`, priority: "critical" },
    { id: "sh-1", title: "2 orders awaiting dispatch", detail: "Orders past their promised ship date by 1 day.", priority: "high" },
    { id: "sh-2", title: "Carrier rate change", detail: "Primary courier raised zone rates ~6% this week.", priority: "normal" },
  ];
  const returnsAlerts: Alert[] = [
    { id: "rt-0", title: "Return spike on one channel", detail: `Returns on your top channel are up vs. last month — worth investigating quality or sizing.`, priority: "high" },
    { id: "rt-1", title: "3 items above 20% return rate", detail: "High-return SKUs are eating into margin.", priority: "normal" },
  ];
  const paymentsAlerts: Alert[] = [
    { id: "pm-0", title: "COD collections pending", detail: `${cur}84,000 in cash-on-delivery not yet reconciled.`, priority: "high" },
    { id: "pm-1", title: "1 invoice overdue", detail: "A distributor invoice is 7 days past due.", priority: "normal" },
  ];
  const marginAlerts: Alert[] = [
    { id: "mg-0", title: "Margin slipped on a top product", detail: "A high-volume SKU's margin dropped after the last cost change.", priority: "high" },
    { id: "mg-1", title: "Discount depth trending up", detail: "Average discount is creeping higher across orders.", priority: "normal" },
  ];

  return [
    { id: "po", name: "Generate PO", icon: "po", dataDriven: real, alerts: poAlerts },
    { id: "stockout", name: "Stock-outs", icon: "stockout", dataDriven: real, alerts: stockAlerts },
    { id: "slow", name: "Slow-movers", icon: "slow", dataDriven: real, alerts: slowAlerts },
    { id: "demand", name: "Fast-movers & Demand", icon: "demand", dataDriven: real, alerts: demandAlerts },
    { id: "shipping", name: "Shipping & Deliveries", icon: "shipping", dataDriven: false, alerts: shippingAlerts },
    { id: "returns", name: "Returns", icon: "returns", dataDriven: false, alerts: returnsAlerts },
    { id: "payments", name: "Payments & Invoices", icon: "payments", dataDriven: false, alerts: paymentsAlerts },
    { id: "margins", name: "Margins & Pricing", icon: "margins", dataDriven: false, alerts: marginAlerts },
  ];
}
