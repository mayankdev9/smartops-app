"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Bell, LayoutDashboard, Menu, MessageSquare, Settings, X, Zap } from "lucide-react";
import { business } from "@/lib/data";

// Customer-journey order (per professor feedback): start on the Dashboard for
// overall business status, drill into details, and reach the Assistant last.
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alerts", label: "Daily Alert", icon: Bell },
  { href: "/onboarding", label: "Setup & Data", icon: Settings },
  { href: "/assistant", label: "Assistant", icon: MessageSquare },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
        <Zap size={20} strokeWidth={2.5} />
      </div>
      <div>
        <h1 className="text-[15px] font-bold leading-tight text-slate-900">SmartOps</h1>
        <p className="text-xs leading-tight text-slate-500">Operations AI Agent</p>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active ? "bg-blue-50 text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Footer() {
  return (
    <div className="border-t border-slate-100 px-4 py-4">
      <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
        <BadgeCheck size={14} />
        Critic-validated answers
      </div>
      <div className="px-1">
        <p className="text-sm font-semibold text-slate-800">{business.name}</p>
        <p className="text-xs text-slate-500">{business.type}</p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-100 px-5 py-4">
          <Brand />
        </div>
        <NavLinks />
        <Footer />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer + overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <Footer />
          </aside>
        </div>
      )}
    </>
  );
}
