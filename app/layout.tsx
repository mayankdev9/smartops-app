import type { Metadata } from "next";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartOps — Your Operations AI Agent",
  description:
    "Plain-English AI assistant for SMB distributors. Stockout risk, forecasting, ABC analysis — every answer Critic-validated.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
