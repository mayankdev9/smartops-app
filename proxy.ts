import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge-safe: built from auth.config.ts only (no Credentials provider, so no
// bcrypt/Drizzle in this bundle). Runs before any protected page renders,
// which removes the old AuthGate.tsx's hydration-guard flash-of-unauthenticated
// content problem entirely — there's no client-side "mounted" check anymore.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

// API routes are excluded here (not just /api/auth) — a redirect response
// doesn't make sense for a fetch() caller expecting JSON. Route handlers that
// need auth (e.g. /api/assistant) check the session themselves and return a
// proper 401 instead.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|upload-worker.js).*)"],
};
