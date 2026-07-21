"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { BadgeCheck, LogIn } from "lucide-react";
import AuthField from "@/components/AuthField";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [companyCode, setCompanyCode] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin() {
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      companyCode,
      userId,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Wrong company code, user ID, or password.");
      return;
    }
    router.push(searchParams.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Log in</h2>
        <div className="space-y-3">
          <AuthField
            label="Company code"
            value={companyCode}
            onChange={setCompanyCode}
            placeholder="e.g. CAVA-7F3K"
            autoCapitalize="characters"
          />
          <AuthField label="User ID" value={userId} onChange={setUserId} placeholder="e.g. admin" />
          <AuthField label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••" />
          <button
            onClick={doLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            <LogIn size={16} /> {loading ? "Logging in…" : "Log in"}
          </button>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}
        <p className="mt-4 text-center text-xs text-slate-500">
          New company?{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            Create one
          </Link>
        </p>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <BadgeCheck size={13} className="text-emerald-500" /> Every answer Critic-validated before you act.
      </p>
    </>
  );
}
