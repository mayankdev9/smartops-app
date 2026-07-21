import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      loginId: string;
      role: "admin" | "member";
      companyId: string;
      companyName: string;
      companyType: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    loginId: string;
    role: "admin" | "member";
    companyId: string;
    companyName: string;
    companyType: string;
  }
}
