import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq, and, sql as rawSql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, users } from "@/lib/db/schema";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        companyCode: {},
        userId: {},
        password: {},
      },
      authorize: async (raw) => {
        const companyCode = String(raw?.companyCode ?? "").trim().toUpperCase();
        const userId = String(raw?.userId ?? "").trim();
        const password = String(raw?.password ?? "");
        if (!companyCode || !userId || !password) return null;

        const [company] = await db.select().from(companies).where(eq(companies.companyCode, companyCode)).limit(1);
        if (!company) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(and(eq(users.companyId, company.id), eq(rawSql`lower(${users.loginId})`, userId.toLowerCase())))
          .limit(1);
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          role: user.role,
          companyId: company.id,
          companyName: company.name,
          companyType: company.type,
        };
      },
    }),
  ],
});
