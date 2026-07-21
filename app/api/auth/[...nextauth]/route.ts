import { handlers } from "@/auth";

// Node runtime, not edge — authorize() needs bcrypt + the DB.
export const runtime = "nodejs";

export const { GET, POST } = handlers;
