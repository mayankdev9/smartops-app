// Column mapping for uploaded spreadsheets.
// The app needs to know which uploaded column is the product, units, amount, etc.
// We auto-guess from column names; the user can override in the Onboarding UI.
// Handles both inventory files (units/stock/price) and sales files (amount/date).

export type FieldKey =
  | "product"
  | "unitsSold"
  | "amount"
  | "date"
  | "state"
  | "channel"
  | "payment"
  | "voucherType"
  | "onHand"
  | "price"
  | "cost";

export type Mapping = Partial<Record<FieldKey, string>>;

// Order matters for auto-detect (each column is claimed once, top to bottom).
export const FIELDS: { key: FieldKey; label: string; required: boolean; hint: string }[] = [
  { key: "product", label: "Product / SKU", required: true, hint: "The item name or code" },
  { key: "unitsSold", label: "Units / quantity", required: true, hint: "Quantity per row" },
  { key: "amount", label: "Sales / revenue amount", required: false, hint: "Revenue per row — powers Revenue & AOV" },
  { key: "date", label: "Order date", required: false, hint: "Powers the revenue trend over time" },
  { key: "state", label: "State / region", required: false, hint: "Powers the revenue-by-region chart" },
  { key: "channel", label: "Sales channel", required: false, hint: "Marketplace / store — powers revenue-by-channel" },
  { key: "payment", label: "Payment method", required: false, hint: "Prepaid / COD — powers the payment split" },
  { key: "voucherType", label: "Voucher / transaction type", required: false, hint: "Marks returns (e.g. Credit Note) — powers returns & net revenue" },
  { key: "onHand", label: "Units on hand", required: false, hint: "Current stock — powers stockout risk" },
  { key: "price", label: "Selling price", required: false, hint: "Per-unit price (used if there's no amount column)" },
  { key: "cost", label: "Unit cost", required: false, hint: "Per-unit cost — powers margins" },
];

// Keyword patterns per field. amount is separate from unitsSold so a "Sales"
// column (revenue) isn't mistaken for a quantity.
const KEYWORDS: Record<FieldKey, RegExp> = {
  product: /\b(sku|product|item|article)\b|product.?name|item.?name/i,
  unitsSold: /(sold|qty|quantity|units|volume|movement|pieces|pcs)\b/i,
  amount: /(sales|revenue|gmv|turnover|net.?sales|amount)\b/i,
  date: /\bdate\b|order.?date|invoice.?date|\b(month|day|period|timestamp|created)\b/i,
  state: /\b(state|province|region)\b/i,
  channel: /\b(channel|marketplace|platform|ledger|store)\b/i,
  payment: /\b(payment|pay.?method|prepaid|\bcod\b|tender|mode)\b/i,
  voucherType: /\b(voucher|transaction.?type|txn.?type|doc.?type|entry.?type)\b/i,
  onHand: /(on.?hand|in.?stock|\bstock\b|inventory|qoh|available|balance|closing)/i,
  price: /\b(price|mrp|rate|selling|unit.?price)\b/i,
  cost: /\b(cost|purchase|buy|landed|cogs)\b/i,
};

/** Best-effort auto-detection: assign each field the first matching, unclaimed column. */
export function autoDetectMapping(columns: string[]): Mapping {
  const mapping: Mapping = {};
  const claimed = new Set<string>();

  for (const { key } of FIELDS) {
    const match = columns.find((c) => !claimed.has(c) && KEYWORDS[key].test(c));
    if (match) {
      mapping[key] = match;
      claimed.add(match);
    }
  }
  return mapping;
}

/** A mapping is usable once the required fields are assigned. */
export function isMappingValid(mapping: Mapping): boolean {
  return FIELDS.filter((f) => f.required).every((f) => !!mapping[f.key]);
}
