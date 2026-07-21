import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as a plain Node script, so it doesn't get Next.js's
// automatic .env.local loading the way `next dev`/`next build` do.
config({ path: ".env.local" });

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
