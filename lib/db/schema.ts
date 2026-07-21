import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // e.g. "CAVA-7F3K" — shown to the admin right after signup; required to log in.
  companyCode: text("company_code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    loginId: text("login_id").notNull(), // the "User ID" field
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Scoped per-company, not global — two different companies can both have
    // an "admin" login ID, since the company code disambiguates at login.
    uniqueIndex("users_company_login_idx").on(table.companyId, sql`lower(${table.loginId})`),
  ],
);

export type Company = typeof companies.$inferSelect;
export type User = typeof users.$inferSelect;
