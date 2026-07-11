// Column mapping for uploaded spreadsheets.
// The app needs to know which uploaded column is the product, units sold, etc.
// We auto-guess from column names; the user can override in the Onboarding UI.

export type FieldKey = "product" | "unitsSold" | "onHand" | "price" | "cost";

export type Mapping = Partial<Record<FieldKey, string>>;

export const FIELDS: { key: FieldKey; label: string; required: boolean; hint: string }[] = [
  { key: "product", label: "Product / SKU", required: true, hint: "The item name or code" },
  { key: "unitsSold", label: "Units sold", required: true, hint: "Quantity sold in the period" },
  { key: "onHand", label: "Units on hand", required: false, hint: "Current stock — powers stockout risk" },
  { key: "price", label: "Selling price", required: false, hint: "Per-unit price — powers revenue" },
  { key: "cost", label: "Unit cost", required: false, hint: "Per-unit cost — powers margins" },
];

// Keyword patterns per field. Order of FIELDS matters: each column is claimed once.
const KEYWORDS: Record<FieldKey, RegExp> = {
  product: /\b(sku|product|item|name|description|article)\b/i,
  unitsSold: /(sold|qty|quantity|units|sales|volume|movement)/i,
  onHand: /(on.?hand|in.?stock|stock|inventory|qoh|available|balance|closing)/i,
  price: /(price|mrp|rate|selling|revenue|amount)/i,
  cost: /(cost|purchase|buy|landed|cogs)/i,
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
