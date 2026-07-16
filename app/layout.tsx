import type { Metadata } from "next";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartOps — AI General Manager for Small Distributors",
  description:
    "An AI General Manager for small distributors — runs your operations, flags what's urgent, and tells you what to do next. Every answer Critic-validated.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden pt-14 md:pt-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
