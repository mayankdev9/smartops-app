"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Send, Sparkles } from "lucide-react";
import Markdown from "@/components/Markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  criticValidated?: boolean;
  toolUsed?: string;
  latencyMs?: number;
}

const SUGGESTIONS = [
  "Which SKUs are about to run out?",
  "Where is my capital frozen in slow-movers?",
  "Which products actually matter? (ABC)",
  "Forecast Coca-Cola demand for next month",
  "How's the business doing?",
];

const TOOL_LABELS: Record<string, string> = {
  stockout: "Stockout Risk",
  slow: "Slow-Mover Analysis",
  abc: "ABC Classification",
  forecast: "Demand Forecast",
  kpi: "KPI Dashboard",
  general: "Assistant",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, businessContext: {} }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? "Something went wrong. Please try again.",
          criticValidated: data.criticValidated,
          toolUsed: data.toolUsed,
          latencyMs: data.latencyMs,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't reach the assistant. Is the dev server running?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
        <div>
          <h2 className="text-[15px] font-bold leading-tight text-slate-900">Assistant</h2>
          <p className="text-xs leading-tight text-slate-500">Ask your operations anything, in plain English</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <BadgeCheck size={14} />
          Critic-validated answers
        </div>
      </header>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {empty ? (
            <div className="mt-8 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
                <Sparkles size={28} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Ask your operations anything</h2>
              <p className="mt-2 max-w-md text-slate-500">
                Plain-English answers about stock, demand, and cash — pulled from your data and checked
                by the Critic before you see them.
              </p>
              <div className="mt-8 flex w-full max-w-lg flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:border-brand hover:bg-blue-50/40 hover:text-brand"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m, idx) => (
                <div key={idx} className="animate-in">
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-[15px] text-white">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        {/* Tool + Critic badge row */}
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          {m.toolUsed && m.toolUsed !== "general" && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {TOOL_LABELS[m.toolUsed] ?? m.toolUsed}
                            </span>
                          )}
                          {m.criticValidated ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              <BadgeCheck size={13} /> Critic validated
                            </span>
                          ) : m.toolUsed && m.toolUsed !== "general" ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              ⚠ Needs review
                            </span>
                          ) : null}
                          {typeof m.latencyMs === "number" && (
                            <span className="ml-auto text-xs text-slate-400">{(m.latencyMs / 1000).toFixed(1)}s</span>
                          )}
                        </div>
                        <Markdown text={m.content} />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                    <span className="ml-1 text-xs text-slate-400">Running pipeline + Critic…</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about stock, demand, slow-movers, forecasts…"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-dark disabled:opacity-40"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </form>
        <p className="mx-auto mt-1.5 max-w-3xl text-center text-xs text-slate-400">
          Mock data for prototype — Ahmer&apos;s live pipeline plugs in behind <code>/api/assistant</code>.
        </p>
      </div>
    </div>
  );
}
