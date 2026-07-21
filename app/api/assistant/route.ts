import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMockResponse } from "@/lib/mock";
import { getSmallTalk } from "@/lib/smalltalk";

/**
 * THE INTEGRATION SEAM.
 *
 * The whole front-end talks to this ONE endpoint.
 *
 * Contract (matches Ahmer's FastAPI backend `POST /assistant` exactly):
 *   POST /api/assistant
 *     →  { message: string, history: Msg[], businessContext: object }
 *     ←  { answer: string, criticValidated: boolean, toolUsed: string, latencyMs: number, chart?: unknown }
 *
 * Behaviour:
 *   - If ASSISTANT_BACKEND_URL is set → PROXY to Ahmer's real 5-LLM + Critic
 *     pipeline (repo: github.com/ahmer64-sketch/smartops-backend, `server.py`).
 *   - Otherwise → fall back to the local mock (lib/mock.ts) so dev/preview works
 *     with no backend running.
 *
 * Ahmer's pipeline can take ~10s, so we allow a longer function duration.
 */

export const maxDuration = 60;

export interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface AssistantResponse {
  answer: string;
  criticValidated: boolean;
  toolUsed: string;
  latencyMs: number;
  chart?: unknown;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { message, history = [], businessContext = {} } = (await req.json()) as {
    message: string;
    history?: Msg[];
    businessContext?: Record<string, unknown>;
  };

  if (!message || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const started = Date.now();

  // ── Small talk / gestures (greetings, thanks, "what can you do") ──────────
  // Answer instantly and never send these through the heavy pipeline.
  const small = getSmallTalk(message);
  if (small) {
    return NextResponse.json({
      answer: small.answer,
      criticValidated: small.criticValidated,
      toolUsed: small.toolUsed,
      latencyMs: Date.now() - started,
    } satisfies AssistantResponse);
  }

  const backendUrl = process.env.ASSISTANT_BACKEND_URL;

  // ── Ahmer's real backend (proxy) ──────────────────────────────────────────
  if (backendUrl) {
    try {
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, businessContext }),
        signal: AbortSignal.timeout(55000),
      });
      if (!res.ok) throw new Error(`backend responded ${res.status}`);
      const data = (await res.json()) as Partial<AssistantResponse>;
      return NextResponse.json({
        answer: data.answer ?? "No answer was returned.",
        criticValidated: data.criticValidated ?? false,
        toolUsed: data.toolUsed ?? "general",
        chart: data.chart ?? null,
        latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : Date.now() - started,
      } satisfies AssistantResponse);
    } catch (err) {
      // Don't hard-fail the UI if the backend is down — return a friendly message.
      return NextResponse.json({
        answer:
          "⚠️ The assistant is temporarily unavailable. Please try again in a moment.",
        criticValidated: false,
        toolUsed: "general",
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : "backend error",
      });
    }
  }

  // ── Local mock fallback (no backend configured) ───────────────────────────
  const mock = getMockResponse(message);
  await new Promise((r) => setTimeout(r, mock.latencyMs));
  return NextResponse.json({
    answer: mock.answer,
    criticValidated: mock.criticValidated,
    toolUsed: mock.toolUsed,
    latencyMs: Date.now() - started,
  });
}
