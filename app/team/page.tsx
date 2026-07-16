"use client";

import { useState } from "react";
import { Building2, Database, Shield, Trash2, User as UserIcon, UserPlus } from "lucide-react";
import { useAuthStore, useCompanyUsers, useCurrentCompany, useCurrentUser } from "@/lib/authStore";
import { useCompanyDataMeta, useDashboardData } from "@/lib/store";

export default function TeamPage() {
  const company = useCurrentCompany();
  const me = useCurrentUser();
  const users = useCompanyUsers();
  const addUser = useAuthStore((s) => s.addUser);
  const removeUser = useAuthStore((s) => s.removeUser);

  const d = useDashboardData();
  const meta = useCompanyDataMeta();

  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");

  if (me?.role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <Shield size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Admins only</p>
          <p className="text-xs text-slate-500">Ask your company admin to manage the team.</p>
        </div>
      </div>
    );
  }

  function submit() {
    const r = addUser({ name, userId, password, role });
    if (r.ok) {
      setAdded(`${name} (${userId}) added.`);
      setError("");
      setName(""); setUserId(""); setPassword(""); setRole("member");
      setTimeout(() => setAdded(""), 3000);
    } else {
      setError(r.error ?? "Could not add user.");
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3.5">
        <h2 className="text-[15px] font-bold leading-tight text-slate-900">Team</h2>
        <p className="text-xs leading-tight text-slate-500">Manage your company account and users</p>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 p-6">
        {/* Company + shared data */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-400"><Building2 size={16} /><span className="text-xs font-medium text-slate-500">Company</span></div>
            <p className="text-sm font-semibold text-slate-900">{company?.name}</p>
            <p className="text-xs text-slate-500">{company?.type}</p>
            <p className="mt-2 text-xs text-slate-400">{users.length} user{users.length === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-400"><Database size={16} /><span className="text-xs font-medium text-slate-500">Shared company data</span></div>
            {d.isSample ? (
              <p className="text-sm text-slate-600">No data uploaded yet. Anyone on the team can upload in <span className="font-medium">Setup &amp; Data</span> and it&apos;s shared with everyone.</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-900">{d.source}</p>
                <p className="text-xs text-slate-500">
                  Uploaded by {meta?.uploadedBy ?? "a teammate"}
                  {meta?.uploadedAt ? ` on ${new Date(meta.uploadedAt).toLocaleDateString()}` : ""}
                </p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Shared with all {users.length} users</p>
              </>
            )}
          </div>
        </div>

        {/* Add user */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2"><UserPlus size={16} className="text-brand" /><h3 className="text-sm font-semibold text-slate-800">Add a user</h3></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100" />
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID (login)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Demo password" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100" />
            <select value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button onClick={submit} className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">Add user</button>
          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
          {added && <p className="mt-2 text-xs font-medium text-emerald-600">{added}</p>}
          <p className="mt-2 text-xs text-slate-400">Prototype accounts — use demo passwords only, not real ones.</p>
        </div>

        {/* User list */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Users</h3>
          <div className="space-y-1">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserIcon size={15} /></div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{u.name} {u.id === me?.id && <span className="text-xs text-slate-400">(you)</span>}</p>
                    <p className="text-xs text-slate-500">ID: <span className="font-mono">{u.id}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${u.role === "admin" ? "bg-blue-50 text-brand" : "bg-slate-100 text-slate-500"}`}>{u.role}</span>
                  {u.id !== me?.id && (
                    <button onClick={() => removeUser(u.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove user">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
