import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

// HTTP-based driver (not a TCP driver like `pg`) so this works in both the
// Node runtime (server actions, the auth route) and the Edge runtime
// (middleware) without a runtime-specific surprise — the project was already
// burned once by a dependency that only worked in one Next.js runtime.
function getDb(): Db {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    cached = drizzle(neon(url), { schema });
  }
  return cached;
}

// Lazy: `neon()` throws immediately if DATABASE_URL is unset, and Next's
// build-time page-data collection imports every route module for static
// analysis without ever running a request handler. A Proxy defers the real
// connection until a query actually executes, so `npm run build` stays green
// even when secrets are briefly unset (e.g. a fresh Vercel Preview).
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});
