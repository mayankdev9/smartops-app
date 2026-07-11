# SmartOps — Operations AI Agent (front-end)

Mayank's front-end for Team 5's SmartOps: a plain-English AI assistant for SMB
distributors (FMCG / general-trade). Ahmer's 5-LLM + Critic pipeline plugs in
behind a single endpoint; this app owns the UI and the integration seam.

## Stack
Next.js 16 · TypeScript · Tailwind CSS v3 · lucide-react · (Recharts for later dashboards)

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
```
No API key needed — the Chat screen runs against a built-in mock.

## Architecture — the integration seam
The whole UI talks to ONE endpoint:

```
POST /api/assistant
  →  { message, history, businessContext }
  ←  { answer, criticValidated, toolUsed, latencyMs }
```

- **Today:** `app/api/assistant/route.ts` returns a mock from `lib/mock.ts`
  (routes queries to stockout / slow / abc / forecast / kpi, simulates the
  Critic passing >90% of the time, and fakes pipeline latency).
- **Later:** swap the handler body for Ahmer's real pipeline — either run it
  inside the route (JS/TS) or proxy to his service via `ASSISTANT_BACKEND_URL`.
  The Chat UI never changes because the response shape is identical.

## Built so far — MVP complete ✅
- [x] **Sidebar nav** (`components/Sidebar.tsx`) — shared shell across all screens
- [x] **Chat / Assistant screen** (`app/page.tsx`) — Q&A, suggested prompts,
      "✓ Critic validated" badge, tool label, response time, typing indicator
- [x] **Dashboard** (`app/dashboard/page.tsx`) — KPI cards + Recharts
      (revenue area chart, ABC pie, top-SKU bar), reorder + slow-mover panels
- [x] **Daily Alert view** (`app/alerts/page.tsx`) — 8 AM digest, WhatsApp/email
      toggle, delivery settings
- [x] **Onboarding / Data connect** (`app/onboarding/page.tsx`) — 3-step setup +
      Excel-upload stub
- [x] Mock `/api/assistant` + `lib/mock.ts`; shared mock data in `lib/data.ts`
- [x] `components/Markdown.tsx` — renders bold / lists / tables in answers

## Next (enhancements)
- Wire Ahmer's real pipeline behind `/api/assistant`
- Deploy to Vercel
- Polish pass (mobile responsiveness, real upload handling, richer charts)

## Deploy
Vercel (same as claro-app). Secrets go in Vercel env vars, never in code.
See `.env.local.example`.
