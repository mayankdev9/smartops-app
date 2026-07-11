"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DashboardData } from "./analytics";
import { sampleDashboard } from "./data";

interface DataState {
  // The computed dashboard from an uploaded file, or null to use sample data.
  data: DashboardData | null;
  setData: (d: DashboardData) => void;
  clear: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      data: null,
      setData: (data) => set({ data }),
      clear: () => set({ data: null }),
    }),
    { name: "smartops-data" },
  ),
);

/** Returns the uploaded dataset's dashboard if present, else the built-in sample. */
export function useDashboardData(): DashboardData {
  const data = useDataStore((s) => s.data);
  return data ?? sampleDashboard;
}
