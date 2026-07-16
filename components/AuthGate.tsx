"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, LogIn, Zap } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import Sidebar from "@/components/Sidebar";

const TYPES = [
  "FMCG / General-Trade Distributor",
  "Wholesale / Cash & Carry",
  "Pharma Distributor",
  "Electronics / Hardware Distributor",
];

function Brand() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
        <Zap size={22} strokeWidth={2.5} />
      </div>
      <div className="text-left">
        <h1 className="text-lg font-bold leading-tight text-slate-900">SmartOps</h1>
        <p className="text-xs leading-tight text-slate-500">AI General Manager</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function AuthScreens() {
  const login = useAuthStore((s) => s.login);
  const createCompany = useAuthStore((s) => s.createCompany);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");

  // login fields
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  // signup fields
  const [company, setCompany] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [adminName, setAdminName] = useState("");
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");

  function doLogin() {
    const r = login(userId, password);
    setError(r.ok ? "" : r.error ?? "Login failed.");
  }
  function doSignup() {
    const r = createCompany({ name: company, type, adminName, adminUserId: adminId, adminPassword: adminPw });
    setError(r.ok ? "" : r.error ?? "Could not create account.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <Brand />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex rounded-lg border border-slate-200 p-1 text-sm">
            <button onClick={() => { setMode("login"); setError(""); }} className={`flex-1 rounded-md py-1.5 font-medium transition ${mode === "login" ? "bg-brand text-white" : "text-slate-600"}`}>Log in</button>
            <button onClick={() => { setMode("signup"); setError(""); }} className={`flex-1 rounded-md py-1.5 font-medium transition ${mode === "signup" ? "bg-brand text-white" : "text-slate-600"}`}>Create company</button>
          </div>

          {mode === "login" ? (
            <div className="space-y-3">
              <Field label="User ID" value={userId} onChange={setUserId} placeholder="e.g. admin" />
              <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••" />
              <button onClick={doLogin} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
                <LogIn size={16} /> Log in
              </button>
              <p className="text-center text-xs text-slate-400">Demo login: <span className="font-mono font-medium text-slate-500">admin / demo</span></p>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Company name" value={company} onChange={setCompany} placeholder="Your company" />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Business type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand">
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <Field label="Your name (admin)" value={adminName} onChange={setAdminName} placeholder="Your name" />
              <Field label="Admin user ID" value={adminId} onChange={setAdminId} placeholder="Pick a login ID" />
              <Field label="Password" value={adminPw} onChange={setAdminPw} type="password" placeholder="Set a demo password" />
              <button onClick={doSignup} className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
                Create company account
              </button>
            </div>
          )}

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <BadgeCheck size={13} className="text-emerald-500" /> Prototype accounts — use demo credentials only, not real passwords.
        </p>
      </div>
    </div>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const session = useAuthStore((s) => s.session);
  const seed = useAuthStore((s) => s.seedDemoIfEmpty);

  useEffect(() => {
    seed();
    setMounted(true);
  }, [seed]);

  // Avoid hydration mismatch: render nothing until the client store is ready.
  if (!mounted) return null;

  if (!session) return <AuthScreens />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden pt-14 md:pt-0">{children}</main>
    </div>
  );
}
