import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartOps — AI General Manager for Small Distributors",
  description:
    "An AI General Manager for small distributors — runs your operations, flags what's urgent, and tells you what to do next. Every answer Critic-validated.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
