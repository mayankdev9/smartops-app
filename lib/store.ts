"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DashboardData } from "./analytics";
import { sampleDashboard } from "./data";
import { useAuthStore } from "./authStore";

// Data is scoped BY COMPANY — this is the "shared data warehouse": whichever user
// in a company uploads a file, every user in that company sees it. Keyed by
// companyId so different companies never see each other's data.

export interface CompanyRecord {
  data: DashboardData;
  uploadedBy: string; // user's display name
  uploadedAt: number; // epoch ms
}

interface DataState {
  records: Record<string, CompanyRecord>;
  setData: (companyId: string, data: DashboardData, uploadedBy: string) => void;
  clear: (companyId: string) => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      records: {},
      setData: (companyId, data, uploadedBy) =>
        set((s) => ({ records: { ...s.records, [companyId]: { data, uploadedBy, uploadedAt: Date.now() } } })),
      clear: (companyId) =>
        set((s) => {
          const next = { ...s.records };
          delete next[companyId];
          return { records: next };
        }),
    }),
    { name: "smartops-data" },
  ),
);

/** The current company's uploaded dashboard, or the built-in sample if none. */
export function useDashboardData(): DashboardData {
  const companyId = useAuthStore((s) => s.session?.companyId);
  const rec = useDataStore((s) => (companyId ? s.records[companyId] : undefined));
  return rec?.data ?? sampleDashboard;
}

/** Metadata about the current company's uploaded data (who/when), or null. */
export function useCompanyDataMeta(): { uploadedBy: string; uploadedAt: number } | null {
  const companyId = useAuthStore((s) => s.session?.companyId);
  const rec = useDataStore((s) => (companyId ? s.records[companyId] : undefined));
  return rec ? { uploadedBy: rec.uploadedBy, uploadedAt: rec.uploadedAt } : null;
}
