// Client-side spreadsheet parser for the Onboarding upload.
// SheetJS reads .csv, .xlsx and .xls with one API, so we support all three.

import * as XLSX from "xlsx";

export interface ParsedUpload {
  fileName: string;
  columns: string[];
  rowCount: number;
  rows: Record<string, string | number>[]; // all rows (for computing metrics)
  preview: Record<string, string | number>[]; // first few rows (for the UI table)
}

const MAX_PREVIEW_ROWS = 5;

export async function parseUpload(file: File): Promise<ParsedUpload> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) throw new Error("The file has no sheets.");

  const ws = wb.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, {
    defval: "",
  });

  if (rows.length === 0) throw new Error("No rows found — is the first row a header?");

  const columns = Object.keys(rows[0]);
  return {
    fileName: file.name,
    columns,
    rowCount: rows.length,
    rows,
    preview: rows.slice(0, MAX_PREVIEW_ROWS),
  };
}
