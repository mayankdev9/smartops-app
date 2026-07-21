"use server";

import { eq, and, sql as rawSql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { companies, users } from "@/lib/db/schema";

interface Result {
  ok: boolean;
  error?: string;
  companyCode?: string;
}

const SALT_ROUNDS = 10;

function slugPrefix(name: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (letters.slice(0, 4) || "CO").padEnd(2, "X");
}

function randomSuffix(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I ambiguity
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function generateUniqueCompanyCode(name: string): Promise<string> {
  const prefix = slugPrefix(name);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `${prefix}-${randomSuffix()}`;
    const [existing] = await db.select({ id: companies.id }).from(companies).where(eq(companies.companyCode, code)).limit(1);
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique company code — please try again.");
}

export async function createCompanyAction(o: {
  name: string;
  type: string;
  adminName: string;
  adminUserId: string;
  adminPassword: string;
}): Promise<Result> {
  const name = o.name.trim();
  const adminName = o.adminName.trim();
  const adminUserId = o.adminUserId.trim();
  const adminPassword = o.adminPassword;

  if (!name || !adminName || !adminUserId || !adminPassword) {
    return { ok: false, error: "Please fill in every field." };
  }
  if (adminPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const companyCode = await generateUniqueCompanyCode(name);
  const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

  const [company] = await db.insert(companies).values({ name, type: o.type, companyCode }).returning();
  await db.insert(users).values({
    companyId: company.id,
    loginId: adminUserId,
    name: adminName,
    passwordHash,
    role: "admin",
  });

  return { ok: true, companyCode };
}

export async function addUserAction(o: {
  name: string;
  userId: string;
  password: string;
  role: "admin" | "member";
}): Promise<Result> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { ok: false, error: "Only company admins can add users." };
  }

  const name = o.name.trim();
  const userId = o.userId.trim();
  if (!name || !userId || !o.password) return { ok: false, error: "Please fill in every field." };
  if (o.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.companyId, session.user.companyId), eq(rawSql`lower(${users.loginId})`, userId.toLowerCase())))
    .limit(1);
  if (existing) return { ok: false, error: "That user ID is already taken in your company." };

  const passwordHash = await bcrypt.hash(o.password, SALT_ROUNDS);
  await db.insert(users).values({
    companyId: session.user.companyId,
    loginId: userId,
    name,
    passwordHash,
    role: o.role,
  });

  return { ok: true };
}

export async function getCompanyUsersAction(): Promise<
  { id: string; name: string; loginId: string; role: "admin" | "member" }[]
> {
  const session = await auth();
  if (!session?.user) return [];
  return db
    .select({ id: users.id, name: users.name, loginId: users.loginId, role: users.role })
    .from(users)
    .where(eq(users.companyId, session.user.companyId));
}

export async function removeUserAction(userId: string): Promise<Result> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { ok: false, error: "Only company admins can remove users." };
  }
  if (userId === session.user.id) {
    return { ok: false, error: "You can't remove yourself." };
  }
  await db.delete(users).where(and(eq(users.id, userId), eq(users.companyId, session.user.companyId)));
  return { ok: true };
}
