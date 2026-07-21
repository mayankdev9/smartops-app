import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import type { DashboardData } from "../analytics";

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

// One row per company — the shared data warehouse. Only the *computed*
// DashboardData (aggregates/top-N lists) is stored here, never raw uploaded
// rows, so this stays small regardless of how big the source file was.
export const dashboards = pgTable("dashboards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: uuid("company_id")
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<DashboardData>().notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Company = typeof companies.$inferSelect;
export type User = typeof users.$inferSelect;
export type Dashboard = typeof dashboards.$inferSelect;
