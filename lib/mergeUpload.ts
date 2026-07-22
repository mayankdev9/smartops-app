// Shared helpers for combining multiple uploaded files into one dashboard
// (Phase 4). The core idea: rather than teaching computeDashboard about
// multiple files, rename each file's mapped columns to canonical FieldKey
// names, concatenate the rows, and call computeDashboard ONCE with an
// identity "union" mapping. computeDashboard/toItems already handle
// sales-shaped and inventory-shaped rows for the same product correctly
// (Math.max for stock/price/cost, += for units/revenue), so this reuses the
// existing analytics engine untouched.

import { FIELDS, type Mapping, type FieldKey } from "./mapping";

const CANONICAL_KEYS: FieldKey[] = FIELDS.map((f) => f.key);

/** Rename a file's rows so every mapped column is keyed by its canonical FieldKey. */
export function renameToCanonical(
  rows: Record<string, unknown>[],
  mapping: Mapping,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const key of CANONICAL_KEYS) {
      const col = mapping[key];
      if (col && col in row) out[key] = row[col];
    }
    return out;
  });
}

/**
 * Identity mapping containing only the FieldKeys actually mapped in at least
 * one contributing file — so e.g. hasInventory only becomes true if an
 * inventory-shaped file was really included, not just because the canonical
 * schema happens to have an onHand slot.
 */
export function buildUnionMapping(mappings: Mapping[]): Mapping {
  const union: Mapping = {};
  for (const key of CANONICAL_KEYS) {
    if (mappings.some((m) => !!m[key])) union[key] = key;
  }
  return union;
}

/** A short, human-readable label for what's driving a combined dashboard. */
export function describeSource(fileNames: string[]): string {
  if (fileNames.length <= 1) return fileNames[0] ?? "Uploaded data";
  const shown = fileNames.slice(0, 2).join(", ");
  const rest = fileNames.length - 2;
  return `Combined (${fileNames.length} files): ${shown}${rest > 0 ? `, +${rest} more` : ""}`;
}

export type FileKind = "sales" | "inventory" | "unknown";

/**
 * Display-only classification (filename hint first, column-based fallback).
 * Purely cosmetic — shown as a badge on the file card — it doesn't change how
 * the merge works underneath, which is driven entirely by buildUnionMapping.
 */
export function classifyFile(fileName: string, mapping: Mapping): FileKind {
  const lower = fileName.toLowerCase();
  if (/\b(sales|revenue|orders?)\b/.test(lower)) return "sales";
  if (/\b(inventory|stock|on.?hand)\b/.test(lower)) return "inventory";
  if (mapping.onHand) return "inventory";
  if (mapping.amount && mapping.date) return "sales";
  if (mapping.amount || mapping.unitsSold) return "sales";
  return "unknown";
}
