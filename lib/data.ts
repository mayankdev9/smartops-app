// Shared mock business data for SmartOps.
// Every screen (Dashboard, Alerts, Chat mock) reads from here so the numbers
// stay consistent across the product. When Ahmer's pipeline is live, this is
// replaced by real data from the connected business.

export const business = {
  name: "Sharma Trading Co.",
  type: "FMCG / General-Trade Distributor",
  locations: 2,
  skuCount: 27,
  owner: "Rajesh Sharma",
};

export const kpis = {
  revenue30d: "₹8.4L",
  revenueUsd: "$10,100",
  revenueDeltaPct: 7,
  unitsSold: 12340,
  frozenCapital: "₹1.84L",
  frozenCapitalPrev: "₹2.1L",
  stockoutRiskCount: 3,
  inventoryTurns: 4.2,
  topSku: "Amul Milk 1L",
};

export interface StockoutRisk {
  sku: string;
  onHand: number;
  dailySales: number;
  daysLeft: number;
  reorder: number;
}

export const stockoutRisks: StockoutRisk[] = [
  { sku: "Coca-Cola 500ml", onHand: 48, dailySales: 22, daysLeft: 2.2, reorder: 600 },
  { sku: "Lay's Classic 45g", onHand: 90, dailySales: 31, daysLeft: 2.9, reorder: 900 },
  { sku: "Dettol Soap 4-pack", onHand: 35, dailySales: 9, daysLeft: 3.9, reorder: 250 },
];

export interface SlowMover {
  sku: string;
  units: number;
  value: string;
  daysIdle: number;
}

export const slowMovers: SlowMover[] = [
  { sku: "Imported Olive Oil 1L", units: 60, value: "₹72,000", daysIdle: 74 },
  { sku: "Diet Energy Drink 250ml", units: 210, value: "₹41,000", daysIdle: 68 },
  { sku: "Premium Green Tea 100ct", units: 45, value: "₹38,000", daysIdle: 61 },
  { sku: "Sugar-free Cookies 200g", units: 130, value: "₹33,000", daysIdle: 63 },
];

// ABC classification — for pie / bar
export const abcBreakdown = [
  { name: "Class A", skus: 5, revenuePct: 71, color: "#1d4ed8" },
  { name: "Class B", skus: 8, revenuePct: 21, color: "#60a5fa" },
  { name: "Class C", skus: 14, revenuePct: 8, color: "#cbd5e1" },
];

// Revenue trend — last 14 days (₹ thousands)
export const revenueTrend = [
  { day: "Jun 28", revenue: 24 },
  { day: "Jun 29", revenue: 27 },
  { day: "Jun 30", revenue: 22 },
  { day: "Jul 1", revenue: 31 },
  { day: "Jul 2", revenue: 29 },
  { day: "Jul 3", revenue: 34 },
  { day: "Jul 4", revenue: 38 },
  { day: "Jul 5", revenue: 26 },
  { day: "Jul 6", revenue: 28 },
  { day: "Jul 7", revenue: 33 },
  { day: "Jul 8", revenue: 35 },
  { day: "Jul 9", revenue: 32 },
  { day: "Jul 10", revenue: 37 },
  { day: "Jul 11", revenue: 40 },
];

// Top SKUs by units — last 30 days
export const topSkus = [
  { sku: "Amul Milk 1L", units: 1180 },
  { sku: "Lay's Classic 45g", units: 910 },
  { sku: "Coca-Cola 500ml", units: 640 },
  { sku: "Parle-G 800g", units: 420 },
  { sku: "Dettol Soap 4-pack", units: 270 },
];

// 30-day forecast for Class A SKUs
export const forecast = [
  { sku: "Coca-Cola 500ml", actual: 640, forecast: 710, trendPct: 11 },
  { sku: "Lay's Classic 45g", actual: 910, forecast: 965, trendPct: 6 },
  { sku: "Parle-G 800g", actual: 420, forecast: 405, trendPct: -4 },
  { sku: "Amul Milk 1L", actual: 1180, forecast: 1240, trendPct: 5 },
];
