import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

// Middleware already guarantees a session exists before this layout ever
// renders (see auth.config.ts's `authorized` callback + middleware.ts's
// matcher), so there's no client-side auth check or hydration-guard here —
// that's what AuthGate.tsx used to need and no longer does.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden pt-14 md:pt-0">{children}</main>
    </div>
  );
}
