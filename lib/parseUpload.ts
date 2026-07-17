// Client-side spreadsheet parser for the Onboarding upload.
// SheetJS reads .csv, .xlsx and .xls with one API, so we support all three.

import * as XLSX from "xlsx";

export interface ParsedData {
  columns: string[];
  rowCount: number;
  rows: Record<string, string | number>[]; // all rows (for computing metrics)
  preview: Record<string, string | number>[]; // first few rows (for the UI table)
}

export interface ParsedUpload extends ParsedData {
  fileName: string;
}

const MAX_PREVIEW_ROWS = 5;

/**
 * Parse a spreadsheet from an ArrayBuffer. This is the heavy part (a 30MB / ~600k
 * row export can take several seconds) and is deliberately buffer-based so it can
 * run inside a Web Worker (see lib/upload.worker.ts) and keep the UI responsive.
 */
export function parseArrayBuffer(buf: ArrayBuffer): ParsedData {
  // Read options tuned for large files: `dense` makes sheet_to_json ~7x faster
  // and lighter on memory for huge sheets, and skipping formula/style/HTML/text
  // work we never use roughly halves XLSX.read time. On the real 588k-row file
  // this cut parsing from ~75s to ~26s (measured), with identical results.
  const wb = XLSX.read(buf, {
    type: "array",
    dense: true,
    cellDates: true, // keep real Date objects so the preview shows dates, not serials
    cellFormula: false,
    cellStyles: false,
    cellNF: false,
    cellHTML: false,
    cellText: false,
    bookVBA: false,
    bookProps: false,
  });

  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) throw new Error("The file has no sheets.");

  const ws = wb.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, {
    defval: "",
  });

  if (rows.length === 0) throw new Error("No rows found — is the first row a header?");

  const columns = Object.keys(rows[0]);
  return { columns, rowCount: rows.length, rows, preview: rows.slice(0, MAX_PREVIEW_ROWS) };
}

export async function parseUpload(file: File): Promise<ParsedUpload> {
  const buf = await file.arrayBuffer();
  return { fileName: file.name, ...parseArrayBuffer(buf) };
}
