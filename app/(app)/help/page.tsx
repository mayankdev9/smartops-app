"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle, LifeBuoy, Mail, MessageSquare } from "lucide-react";

const SUPPORT = [
  { icon: <MessageSquare size={18} />, title: "In-app chat", detail: "Chat with support from inside SmartOps, 9am–6pm on business days." },
  { icon: <Mail size={18} />, title: "Email us", detail: "support@smartops.ai — we reply within one business day." },
  { icon: <LifeBuoy size={18} />, title: "Help center", detail: "Step-by-step guides for setup, uploads, and every feature." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How is SmartOps different from a spreadsheet or a BI dashboard?",
    a: "Spreadsheets and dashboards show you data; SmartOps answers your question. Instead of building and reading a report yourself, you ask in plain English and get the specific numbers, the risks, and the recommended action — already validated. It's the difference between a filing cabinet and a general manager.",
  },
  {
    q: "How do I know I can trust the answers?",
    a: "Every answer is independently checked by a second AI (the Critic) against your actual data before you see it. Answers that pass show a “✓ Critic validated” badge, so you know the numbers are grounded in your data, not guessed.",
  },
  {
    q: "How do I get my data in?",
    a: "Go to Setup & Data and upload a spreadsheet export (.csv or .xlsx). SmartOps auto-detects your columns — you can adjust the mapping if needed — and your Dashboard and Alerts update from your numbers. No new system to learn.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your data is used only to answer your questions and power your dashboard and alerts. It is never sold or shared with third parties.",
  },
  {
    q: "What can the Assistant answer today?",
    a: "Revenue and top products, sales by region and channel, returns, seasonality and trends, overall business KPIs, and SKU-level performance. Reorder planning and demand forecasting are on the near-term roadmap.",
  },
  {
    q: "Do I need to be technical to use it?",
    a: "No. If you can send a text message, you can use SmartOps. There is no query language and nothing to configure — you ask questions the way you'd ask a manager, and answers come back in plain English.",
  },
  {
    q: "How much does it cost?",
    a: "SmartOps is $100 per month with a 30-day free trial and no setup fee — a fraction of the cost of hiring an analyst or implementing a full ERP.",
  },
  {
    q: "Something looks wrong or broke — what do I do?",
    a: "Reach us via in-app chat or support@smartops.ai. SmartOps is cloud-based, so fixes and improvements roll out automatically with no action needed on your side.",
  },
];

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 py-3.5 text-left">
        <span className="text-sm font-semibold text-slate-800">{q}</span>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-4 pr-6 text-sm leading-relaxed text-slate-600">{a}</p>}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3.5">
        <h2 className="text-[15px] font-bold leading-tight text-slate-900">Help &amp; FAQ</h2>
        <p className="text-xs leading-tight text-slate-500">Answers, guides, and how to reach us</p>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* Support options */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SUPPORT.map((s) => (
            <div key={s.title} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-brand">{s.icon}</div>
              <p className="text-sm font-semibold text-slate-900">{s.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.detail}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-1 flex items-center gap-2">
            <HelpCircle size={18} className="text-brand" />
            <h3 className="text-sm font-semibold text-slate-800">Frequently asked questions</h3>
          </div>
          <div>
            {FAQS.map((f) => (
              <FaqRow key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">Still stuck? Email support@smartops.ai and we&apos;ll help you out.</p>
      </div>
    </div>
  );
}
