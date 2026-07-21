import type { NextAuthConfig } from "next-auth";

// Edge-safe base config — NO providers here (Credentials needs bcrypt + the
// DB, both Node-only). Shared by both auth.ts (full config, Node runtime)
// and middleware.ts (Edge runtime, session-check only). Keeping this split
// is what lets middleware.ts satisfy Phase 2's verification requirement
// ("no accidental Node-only imports pulled into the Edge bundle") — the
// project already got burned once by a Turbopack-runtime-specific surprise
// (the upload Web Worker), so this isn't optional caution.
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          loginId: string;
          role: "admin" | "member";
          companyId: string;
          companyName: string;
          companyType: string;
        };
        token.uid = u.id;
        token.loginId = u.loginId;
        token.role = u.role;
        token.companyId = u.companyId;
        token.companyName = u.companyName;
        token.companyType = u.companyType;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.loginId = token.loginId as string;
      session.user.role = token.role as "admin" | "member";
      session.user.companyId = token.companyId as string;
      session.user.companyName = token.companyName as string;
      session.user.companyType = token.companyType as string;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", request.nextUrl));
        return true;
      }
      if (!isLoggedIn) return false; // NextAuth redirects to `pages.signIn` for us

      // Defense in depth: the Team page also re-checks this server-side.
      if (pathname.startsWith("/team") && auth.user.role !== "admin") {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
