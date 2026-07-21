"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { normalizeDashboard, type DashboardData } from "@/lib/analytics";

export interface DashboardRecord {
  data: DashboardData;
  uploadedBy: string;
  uploadedAt: number; // epoch ms
}

export async function getDashboardDataAction(): Promise<DashboardRecord | null> {
  const session = await auth();
  if (!session?.user) return null;
  const [row] = await db.select().from(dashboards).where(eq(dashboards.companyId, session.user.companyId)).limit(1);
  if (!row) return null;
  return {
    data: normalizeDashboard(row.data),
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt.getTime(),
  };
}

export async function saveDashboardDataAction(data: DashboardData): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };
  const uploadedBy = session.user.name ?? "a teammate";
  await db
    .insert(dashboards)
    .values({ companyId: session.user.companyId, data, uploadedBy })
    .onConflictDoUpdate({
      target: dashboards.companyId,
      set: { data, uploadedBy, uploadedAt: new Date() },
    });
  return { ok: true };
}

export async function clearDashboardDataAction(): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };
  await db.delete(dashboards).where(eq(dashboards.companyId, session.user.companyId));
  return { ok: true };
}
