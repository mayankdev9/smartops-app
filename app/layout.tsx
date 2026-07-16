import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuthGate from "@/components/AuthGate";
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
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
