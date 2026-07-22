// Web Worker: parses the uploaded spreadsheet and computes the dashboard off the
// main thread, so a large file (30MB / ~600k rows) never freezes the tab or
// triggers Chrome's "Page unresponsive" dialog.
//
// It keeps the parsed rows in the worker (never shipped back to the main thread)
// and computes on them when the mapping is confirmed — only small payloads
// (columns/preview, then the finished DashboardData) cross the boundary.

import { parseArrayBuffer } from "./parseUpload";
import { computeDashboard } from "./analytics";
import { renameToCanonical } from "./mergeUpload";
import type { Mapping } from "./mapping";

// Typed handle to the worker global that avoids pulling in the webworker lib
// (which would clash with the app's "dom" lib types).
const ctx = self as unknown as {
  postMessage: (message: unknown) => void;
  onmessage: ((e: MessageEvent) => void) | null;
};

type InMessage =
  | { type: "parse"; buffer: ArrayBuffer }
  | { type: "compute"; mapping: Mapping; currency: string; fileName: string }
  | { type: "normalize"; mapping: Mapping };

let rows: Record<string, string | number>[] = [];

ctx.onmessage = (e: MessageEvent) => {
  const msg = e.data as InMessage;
  try {
    if (msg.type === "parse") {
      const p = parseArrayBuffer(msg.buffer);
      rows = p.rows;
      ctx.postMessage({ type: "parsed", payload: { columns: p.columns, rowCount: p.rowCount, preview: p.preview } });
    } else if (msg.type === "compute") {
      const data = computeDashboard(rows, msg.mapping, msg.currency, msg.fileName);
      ctx.postMessage({ type: "computed", payload: data });
    } else if (msg.type === "normalize") {
      // Combining multiple files (Phase 4): rename this file's mapped columns
      // to canonical field keys and hand the full row set back to the main
      // thread, where it's concatenated with other files' normalized rows
      // before one final computeDashboard call.
      const normalized = renameToCanonical(rows, msg.mapping);
      ctx.postMessage({ type: "normalized", payload: normalized });
    }
  } catch (err) {
    ctx.postMessage({ type: "error", error: err instanceof Error ? err.message : "Could not process the file." });
  }
};
