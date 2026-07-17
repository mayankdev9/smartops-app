"use client";

// Main-thread wrapper around the upload Web Worker. It parses + computes off the
// UI thread so big files don't freeze the tab. If a worker can't start (older
// browser, blocked), it falls back to synchronous parsing so the upload still
// works — same behaviour as before, just without the responsiveness win.

import { parseArrayBuffer } from "./parseUpload";
import { computeDashboard, type DashboardData } from "./analytics";
import type { Mapping } from "./mapping";

export interface ParsedMeta {
  columns: string[];
  rowCount: number;
  preview: Record<string, string | number>[];
}

export class UploadSession {
  private worker: Worker | null = null;
  private fallbackRows: Record<string, string | number>[] | null = null;

  /** Parse a file; keeps the rows (in the worker, or in memory) for compute(). */
  async parse(file: File): Promise<ParsedMeta> {
    const buffer = await file.arrayBuffer();
    try {
      const worker = new Worker(new URL("./upload.worker.ts", import.meta.url));
      this.worker = worker;
      // Copy the buffer for the worker; keep the original for a fallback retry.
      return await this.roundtrip<ParsedMeta>(worker, { type: "parse", buffer: buffer.slice(0) }, "parsed");
    } catch {
      // Worker unavailable or failed → parse synchronously (may briefly block).
      this.worker?.terminate();
      this.worker = null;
      const p = parseArrayBuffer(buffer);
      this.fallbackRows = p.rows;
      return { columns: p.columns, rowCount: p.rowCount, preview: p.preview };
    }
  }

  /** Compute the dashboard from the parsed rows + the confirmed mapping. */
  async compute(mapping: Mapping, currency: string, fileName: string): Promise<DashboardData> {
    if (this.worker) {
      return this.roundtrip<DashboardData>(this.worker, { type: "compute", mapping, currency, fileName }, "computed");
    }
    return computeDashboard(this.fallbackRows ?? [], mapping, currency, fileName);
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.fallbackRows = null;
  }

  private roundtrip<T>(worker: Worker, message: unknown, okType: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const onMessage = (e: MessageEvent) => {
        const m = e.data;
        if (m?.type === okType) {
          cleanup();
          resolve(m.payload as T);
        } else if (m?.type === "error") {
          cleanup();
          reject(new Error(m.error));
        }
      };
      const onError = () => {
        cleanup();
        reject(new Error("The file processor failed to start."));
      };
      const cleanup = () => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      worker.postMessage(message);
    });
  }
}
