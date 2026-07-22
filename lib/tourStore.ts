"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TourState {
  hasSeenNavTour: boolean;
  hasSeenUploadTour: boolean;
  markNavTourSeen: () => void;
  markUploadTourSeen: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasSeenNavTour: false,
      hasSeenUploadTour: false,
      markNavTourSeen: () => set({ hasSeenNavTour: true }),
      markUploadTourSeen: () => set({ hasSeenUploadTour: true }),
    }),
    { name: "smartops-tour" },
  ),
);
