"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useSession } from "next-auth/react";
import { normalizeDashboard, type DashboardData } from "./analytics";
import { sampleDashboard } from "./data";
import { getDashboardDataAction, saveDashboardDataAction, clearDashboardDataAction } from "./actions/dashboard";

// Data is scoped BY COMPANY — this is the "shared data warehouse": whichever user
// in a company uploads a file, every user in that company sees it, from any
// device or browser. Backed by Postgres (lib/actions/dashboard.ts) — this
// zustand store is just an in-memory cache for the current tab, populated by
// fetching on first use and updated optimistically on write so the UI feels
// instant without waiting on a round trip.

export interface CompanyRecord {
  data: DashboardData;
  uploadedBy: string;
  uploadedAt: number; // epoch ms
}

interface DataState {
  records: Record<string, CompanyRecord>;
  loaded: Record<string, boolean>;
  ensureLoaded: (companyId: string) => Promise<void>;
  setData: (companyId: string, data: DashboardData, uploadedBy: string) => Promise<void>;
  clear: (companyId: string) => Promise<void>;
}

export const useDataStore = create<DataState>()((set, get) => ({
  records: {},
  loaded: {},

  ensureLoaded: async (companyId) => {
    if (get().loaded[companyId]) return;
    const record = await getDashboardDataAction();
    set((s) => ({
      loaded: { ...s.loaded, [companyId]: true },
      records: record
        ? { ...s.records, [companyId]: { data: normalizeDashboard(record.data), uploadedBy: record.uploadedBy, uploadedAt: record.uploadedAt } }
        : s.records,
    }));
  },

  setData: async (companyId, data, uploadedBy) => {
    set((s) => ({
      loaded: { ...s.loaded, [companyId]: true },
      records: { ...s.records, [companyId]: { data, uploadedBy, uploadedAt: Date.now() } },
    }));
    await saveDashboardDataAction(data);
  },

  clear: async (companyId) => {
    set((s) => {
      const next = { ...s.records };
      delete next[companyId];
      return { records: next };
    });
    await clearDashboardDataAction();
  },
}));

function useCompanyId(): string | undefined {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;
  const ensureLoaded = useDataStore((s) => s.ensureLoaded);
  useEffect(() => {
    if (companyId) ensureLoaded(companyId);
  }, [companyId, ensureLoaded]);
  return companyId;
}

/** The current company's uploaded dashboard, or the built-in sample if none. */
export function useDashboardData(): DashboardData {
  const companyId = useCompanyId();
  const rec = useDataStore((s) => (companyId ? s.records[companyId] : undefined));
  return rec?.data ?? sampleDashboard;
}

/** Metadata about the current company's uploaded data (who/when), or null. */
export function useCompanyDataMeta(): { uploadedBy: string; uploadedAt: number } | null {
  const companyId = useCompanyId();
  const rec = useDataStore((s) => (companyId ? s.records[companyId] : undefined));
  return rec ? { uploadedBy: rec.uploadedBy, uploadedAt: rec.uploadedAt } : null;
}
