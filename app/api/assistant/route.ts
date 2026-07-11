import { NextRequest, NextResponse } from "next/server";
import { getMockResponse } from "@/lib/mock";

/**
 * THE INTEGRATION SEAM.
 *
 * The whole front-end talks to this ONE endpoint. Today it returns a mock
 * (lib/mock.ts). When Ahmer's real 5-LLM + Critic pipeline is ready, swap the
 * body of this handler for ONE of the two options below — the Chat UI never
 * changes because the response shape stays identical.
 *
 * Contract:
 *   POST /api/assistant
 *     →  { message: string, history: Msg[], businessContext: object }
 *     ←  { answer: string, criticValidated: boolean, toolUsed: string, latencyMs: number }
 */

export interface Msg {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const { message } = (await req.json()) as {
    message: string;
    history?: Msg[];
    businessContext?: Record<string, unknown>;
  };

  if (!message || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const started = Date.now();

  // ── CURRENT: mock pipeline ────────────────────────────────────────────────
  const mock = getMockResponse(message);
  // Simulate the pipeline's thinking time so the UI's latency/typing feel real.
  await new Promise((r) => setTimeout(r, mock.latencyMs));

  return NextResponse.json({
    answer: mock.answer,
    criticValidated: mock.criticValidated,
    toolUsed: mock.toolUsed,
    latencyMs: Date.now() - started,
  });

  // ── LATER, OPTION 1: Ahmer's LLM runs inside this route (JS/TS) ────────────
  // const result = await ahmerPipeline({ message, history, businessContext });
  // return NextResponse.json({ ...result, latencyMs: Date.now() - started });
  //
  // ── LATER, OPTION 2: Ahmer's LLM is a separate service — proxy to it ───────
  // const res = await fetch(process.env.ASSISTANT_BACKEND_URL!, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ message, history, businessContext }),
  // });
  // const data = await res.json();
  // return NextResponse.json({ ...data, latencyMs: Date.now() - started });
}
