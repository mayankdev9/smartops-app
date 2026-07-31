"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TourState {
  hasSeenNavTour: boolean;
  hasSeenUploadTour: boolean;
  // Bumped by requestTour() so pages already mounted on /dashboard can react
  // immediately — a route-only signal (?tour=1) never fires if the user is
  // already on that route, since Next.js won't remount the page.
  tourRequestNonce: number;
  markNavTourSeen: () => void;
  markUploadTourSeen: () => void;
  requestTour: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasSeenNavTour: false,
      hasSeenUploadTour: false,
      tourRequestNonce: 0,
      markNavTourSeen: () => set({ hasSeenNavTour: true }),
      markUploadTourSeen: () => set({ hasSeenUploadTour: true }),
      requestTour: () => set((s) => ({ tourRequestNonce: s.tourRequestNonce + 1 })),
    }),
    {
      name: "smartops-tour",
      // Only the "ever seen" flags should survive a reload — the request
      // nonce is a one-shot signal, not persisted state.
      partialize: (s) => ({ hasSeenNavTour: s.hasSeenNavTour, hasSeenUploadTour: s.hasSeenUploadTour }),
    },
  ),
);
