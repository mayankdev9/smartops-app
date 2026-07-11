"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Bell, LayoutDashboard, MessageSquare, Settings, Zap } from "lucide-react";
import { business } from "@/lib/data";

const NAV = [
  { href: "/", label: "Assistant", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alerts", label: "Daily Alert", icon: Bell },
  { href: "/onboarding", label: "Setup & Data", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
          <Zap size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[15px] font-bold leading-tight text-slate-900">SmartOps</h1>
          <p className="text-xs leading-tight text-slate-500">Operations AI Agent</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-blue-50 text-brand"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — business + trust badge */}
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
    </aside>
  );
}
