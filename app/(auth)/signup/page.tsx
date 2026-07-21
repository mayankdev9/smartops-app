"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Check, Copy } from "lucide-react";
import AuthField from "@/components/AuthField";
import { createCompanyAction } from "@/lib/actions/auth";

const TYPES = [
  "FMCG / General-Trade Distributor",
  "Wholesale / Cash & Carry",
  "Pharma Distributor",
  "Electronics / Hardware Distributor",
];

export default function SignupPage() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [adminName, setAdminName] = useState("");
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [companyCode, setCompanyCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function doSignup() {
    setLoading(true);
    setError("");
    const r = await createCompanyAction({ name: company, type, adminName, adminUserId: adminId, adminPassword: adminPw });
    setLoading(false);
    if (!r.ok || !r.companyCode) {
      setError(r.error ?? "Could not create account.");
      return;
    }
    setCompanyCode(r.companyCode);
  }

  async function continueToApp() {
    if (!companyCode) return;
    setLoading(true);
    const res = await signIn("credentials", { companyCode, userId: adminId, password: adminPw, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Account created, but auto-login failed — please log in manually.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  function copyCode() {
    if (!companyCode) return;
    navigator.clipboard.writeText(companyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (companyCode) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Company created</h2>
        <p className="mb-4 text-xs text-slate-500">
          Save this company code — every user (including teammates you add later) needs it to log in.
        </p>
        <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <span className="font-mono text-base font-semibold tracking-wide text-slate-900">{companyCode}</span>
          <button onClick={copyCode} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-blue-50">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button
          onClick={continueToApp}
          disabled={loading}
          className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Continue to Dashboard"}
        </button>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-800">Create company</h2>
      <div className="space-y-3">
        <AuthField label="Company name" value={company} onChange={setCompany} placeholder="Your company" />
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Business type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <AuthField label="Your name (admin)" value={adminName} onChange={setAdminName} placeholder="Your name" />
        <AuthField label="Admin user ID" value={adminId} onChange={setAdminId} placeholder="Pick a login ID" />
        <AuthField label="Password" value={adminPw} onChange={setAdminPw} type="password" placeholder="At least 6 characters" />
        <button
          onClick={doSignup}
          disabled={loading}
          className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create company account"}
        </button>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}
      <p className="mt-4 text-center text-xs text-slate-500">
        Already have a company code?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
