"use client";

// PROTOTYPE multi-tenant auth (front-end only). Companies + users + session are
// kept in a persisted zustand store (localStorage). This is a demo of the flow,
// NOT real security — passwords are stored in plain text in the browser, so it
// must only ever be used with throwaway demo credentials.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

export interface Company {
  id: string;
  name: string;
  type: string;
}

export interface User {
  id: string; // the login ID
  companyId: string;
  name: string;
  password: string; // demo only — never a real password
  role: "admin" | "member";
}

export interface Session {
  userId: string;
  companyId: string;
}

interface Result {
  ok: boolean;
  error?: string;
}

interface AuthState {
  companies: Company[];
  users: User[];
  session: Session | null;

  createCompany: (o: {
    name: string;
    type: string;
    adminName: string;
    adminUserId: string;
    adminPassword: string;
  }) => Result;
  addUser: (o: { name: string; userId: string; password: string; role?: "admin" | "member" }) => Result;
  removeUser: (userId: string) => void;
  login: (userId: string, password: string) => Result;
  logout: () => void;
  seedDemoIfEmpty: () => void;
}

const rid = () => Math.random().toString(36).slice(2, 9);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      companies: [],
      users: [],
      session: null,

      createCompany: ({ name, type, adminName, adminUserId, adminPassword }) => {
        name = name.trim();
        adminUserId = adminUserId.trim();
        if (!name || !adminName.trim() || !adminUserId || !adminPassword) {
          return { ok: false, error: "Please fill in every field." };
        }
        if (get().users.some((u) => u.id.toLowerCase() === adminUserId.toLowerCase())) {
          return { ok: false, error: "That user ID is already taken." };
        }
        const companyId = rid();
        const company: Company = { id: companyId, name, type };
        const admin: User = { id: adminUserId, companyId, name: adminName.trim(), password: adminPassword, role: "admin" };
        set((s) => ({
          companies: [...s.companies, company],
          users: [...s.users, admin],
          session: { userId: admin.id, companyId },
        }));
        return { ok: true };
      },

      addUser: ({ name, userId, password, role = "member" }) => {
        const { session } = get();
        if (!session) return { ok: false, error: "Not signed in." };
        name = name.trim();
        userId = userId.trim();
        if (!name || !userId || !password) return { ok: false, error: "Please fill in every field." };
        if (get().users.some((u) => u.id.toLowerCase() === userId.toLowerCase())) {
          return { ok: false, error: "That user ID is already taken." };
        }
        const user: User = { id: userId, companyId: session.companyId, name, password, role };
        set((s) => ({ users: [...s.users, user] }));
        return { ok: true };
      },

      removeUser: (userId) => {
        const { session } = get();
        if (session?.userId === userId) return; // can't remove yourself
        set((s) => ({ users: s.users.filter((u) => u.id !== userId) }));
      },

      login: (userId, password) => {
        userId = userId.trim();
        const user = get().users.find((u) => u.id.toLowerCase() === userId.toLowerCase());
        if (!user || user.password !== password) return { ok: false, error: "Wrong user ID or password." };
        set({ session: { userId: user.id, companyId: user.companyId } });
        return { ok: true };
      },

      logout: () => set({ session: null }),

      seedDemoIfEmpty: () => {
        if (get().companies.length > 0) return;
        const companyId = "demo-co";
        set({
          companies: [{ id: companyId, name: "Sharma Trading Co.", type: "FMCG / General-Trade Distributor" }],
          users: [
            { id: "admin", companyId, name: "Rajesh Sharma", password: "demo", role: "admin" },
            { id: "priya", companyId, name: "Priya Nair", password: "demo", role: "member" },
          ],
        });
      },
    }),
    { name: "smartops-auth" },
  ),
);

// ---- selectors (call inside components) ----
export function useCurrentUser(): User | null {
  return useAuthStore((s) => (s.session ? s.users.find((u) => u.id === s.session!.userId) ?? null : null));
}
export function useCurrentCompany(): Company | null {
  return useAuthStore((s) => (s.session ? s.companies.find((c) => c.id === s.session!.companyId) ?? null : null));
}
export function useCompanyUsers(): User[] {
  return useAuthStore(
    useShallow((s) => (s.session ? s.users.filter((u) => u.companyId === s.session!.companyId) : [])),
  );
}
