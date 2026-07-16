# SmartOps — Operations AI Agent (front-end)

**Course:** MOR-531 Applied Product Management · USC Marshall · Summer 2026
**Team:** Team 5 — Ahmer Rizvi, Paola Whittier, Abdulrahman Almarwan, Mayank Dev
**Owner of this app:** Mayank Dev (front-end / UI/UX + integration seam)
**Location:** `~/Documents/Claude/Applied Product Management/smartops-app/`
**Repo:** https://github.com/mayankdev9/smartops-app (public, `main` branch)
**Live:** https://smartops-agent.vercel.app (Vercel; auto-deploys on push to `main`; legacy alias `smartops-app-six.vercel.app` also resolves)
**Status:** ✅ MVP complete & DEPLOYED (Jul 11, 2026) — all 5 screens + live API verified in production

> This file is the source-of-truth for the SmartOps front-end. The course-level
> status pointer lives in `../CLAUDE.md` (SmartOps section). Product/positioning
> context (Lean Canvas, pricing, market) also lives there.

---

## What this is

The front-end for Team 5's **SmartOps** — a plain-English AI assistant for SMB
distributors (FMCG / general-trade) with 25+ SKUs who spend 2–3 hrs/day on manual
Excel reports. The owner asks operational questions ("which SKUs are about to run
out?") and gets an answer in seconds, plus a daily 8 AM WhatsApp/email digest.

**Signature differentiator:** every answer carries a **"✓ Critic validated"**
badge — Ahmer's backend runs a 5-LLM pipeline where a Critic LLM validates each
response (>90% pass target) before it reaches the user.

### Division of labor
- **Ahmer** — backend 5-LLM pipeline + the Critic LLM. Already built. Plugs into
  Mayank's product behind one endpoint.
- **Mayank (this app)** — the entire front-end/UX **and the integration seam** so
  Ahmer's model drops in with zero UI changes.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Reuse of Claro stack — Mayank knows it, fast |
| Language | TypeScript (strict) | Type safety; clean `tsc --noEmit` |
| Styling | Tailwind CSS v3 | Same as Claro |
| Charts | Recharts 2.x | Same as Claro |
| Icons | lucide-react | — |
| Hosting (planned) | Vercel | Same as Claro; secrets in env vars |

Node v20.19.2. No API key needed to run — the app ships with a built-in mock.

---

## Architecture — THE INTEGRATION SEAM (the key deliverable)

The entire UI talks to **one endpoint**. This is deliberate: it's the seam Mayank
owns so Ahmer's pipeline can swap in without touching any screen.

```
POST /api/assistant
  →  { message: string, history: Msg[], businessContext: object }
  ←  { answer: string,            // markdown body
       criticValidated: boolean,  // drives the "✓ Critic validated" badge
       toolUsed: string,          // stockout | slow | abc | forecast | kpi | general
       latencyMs: number }
```

- **Today:** `app/api/assistant/route.ts` returns a mock from `lib/mock.ts`.
- **Later (two wiring options, UI unchanged either way):**
  1. Ahmer's LLM is JS/TS → runs *inside* the route.
  2. Ahmer's LLM is a separate service → the route *proxies* to `ASSISTANT_BACKEND_URL`.

Both options are stubbed as commented blocks at the bottom of the route handler.
When the real pipeline lands, `lib/mock.ts` is the only file deleted.

---

## File map

```
smartops-app/
├── app/
│   ├── layout.tsx              ← Root shell: <Sidebar/> + <main> wrapper (all routes)
│   ├── globals.css             ← Tailwind + fade-in / typing-dot animations
│   ├── page.tsx                ← "/" → redirects to /dashboard (default landing)
│   ├── dashboard/page.tsx      ← DASHBOARD (landing) — data-driven KPIs + Recharts
│   ├── assistant/page.tsx      ← ASSISTANT (Chat) — route /assistant (end of flow)
│   ├── alerts/page.tsx         ← DAILY ALERT — 8 AM WhatsApp/email digest
│   ├── onboarding/page.tsx     ← SETUP & DATA — 3-step onboarding + real upload
│   └── api/assistant/route.ts  ← THE INTEGRATION SEAM (mock today, Ahmer later)
├── components/
│   ├── Sidebar.tsx             ← Shared left nav + brand + Critic trust badge
│   └── Markdown.tsx            ← Tiny markdown renderer (bold/lists/tables), no dep
├── lib/
│   ├── mock.ts                 ← Mock engine: routes query→tool, canned answers,
│   │                             fakes Critic pass (~93%) + latency
│   ├── data.ts                 ← Sample business data + `insights` + `sampleDashboard`
│   ├── parseUpload.ts          ← Client-side .csv/.xlsx parser (SheetJS)
│   ├── mapping.ts              ← Auto-detect + validate column→field mapping
│   ├── analytics.ts            ← computeDashboard(rows, mapping) → real KPIs/ABC/…
│   ├── store.ts                ← zustand (persisted): holds computed dashboard
│   └── export.ts               ← Excel (SheetJS) + PDF (jsPDF) report export
├── .env.local.example          ← Env var docs (none needed for mock)
└── README.md                   ← Short run/architecture summary
```

---

## Screens (all built ✅)

| Screen | Route | What's there |
|---|---|---|
| **Assistant** | `/assistant` | Plain-English Q&A, suggested prompts, per-answer tool label + **"✓ Critic validated"** badge, response time, typing indicator, and **charts** — renders the backend's `chart` JSON (`{type,title,data}`) via `components/AssistantChart.tsx` (bar/line, Recharts) under the answer when present. Wired to `/api/assistant`. |
| **Dashboard** | `/dashboard` | **Data-driven** (sample or uploaded — via `useDashboardData()`). Data-source banner + reset; proactive insight cards; 4 KPI cards; Recharts (revenue area, ABC donut, top-SKU bar); "Reorder now" + slow-mover panels; empty states. **Excel + PDF export** buttons in the header. |
| **Alerts** | `/alerts` | **Categorized alert hub** (redesigned Jul 16 — the old WhatsApp/email digest is gone). Full-screen grid of 8 clickable category tiles (Generate PO, Stock-outs, Slow-movers, Fast-movers/Demand, Shipping, Returns, Payments, Margins) with critical/high/normal color-coding + counts. Click a tile → detail panel of that category's alerts. **Generate PO** → downloadable PO PDF (`lib/export.ts` `exportPO`). Data-driven tiles (PO/stockout/slow/demand) derive from `useDashboardData()` via `lib/alerts.ts` (badged "from your data"); Shipping/Returns/Payments/Margins are sample. |
| **Setup & Data** | `/onboarding` | 3-step stepper: **① Business** (details + a "biggest operational headache" question) → **② Connect data** (real .csv/.xlsx upload + column-mapping + currency) → **③ Diagnosis** (closes the loop per Prof feedback — business-health status + "what we found and what to do" computed insights/recommendations from the uploaded/sample data, acknowledging the stated concern; CTAs to Dashboard/Assistant). Uploaded data **drives the Dashboard + Alerts**. |

---

## Data model — `lib/data.ts`

All screens read from one file so numbers stay consistent across the product (a
demo where the Dashboard, Alert, and Chat disagree would break the illusion).

- **business:** Sharma Trading Co., FMCG/general-trade distributor, 2 locations, 27 SKUs, owner Rajesh Sharma
- **kpis:** revenue ₹8.4L (↑7%), 12,340 units, ₹1.84L frozen capital (down from ₹2.1L), 3 stockout risks, 4.2× turns, top SKU Amul Milk 1L
- **stockoutRisks:** Coca-Cola 500ml (2.2d), Lay's 45g (2.9d), Dettol Soap (3.9d)
- **slowMovers:** Olive Oil, Energy Drink, Green Tea, Sugar-free Cookies (60–74d idle)
- **abcBreakdown:** A = 5 SKUs/71% · B = 8/21% · C = 14/8%
- **revenueTrend** (14d), **topSkus** (5), **forecast** (Class A, 30d)

The canned answers in `lib/mock.ts` are written to match these same numbers.

---

## How the mock routes queries — `lib/mock.ts`

`getMockResponse(message)` regex-matches the message to a tool and returns a canned
markdown answer:

| Tool | Triggers on (examples) |
|---|---|
| `stockout` | "run out", "reorder", "low stock", "risk this week" |
| `slow` | "slow-mover", "frozen capital", "dead stock", "not selling" |
| `abc` | "abc", "classify", "which products matter", "80/20" |
| `forecast` | "forecast", "next 30", "demand", "predict" |
| `kpi` | "kpi", "how's the business", "overview", "metrics" |
| `reorder` | "reorder plan", "what should I order", "purchase order", "shopping list" |
| `margin` | "margin", "profit", "markup", "most profitable", "profitability" |
| `general` | fallback — lists what the assistant can do |

> Order matters in `MOCKS` — `pickMock` returns the first regex match, so the
> specific tools (`reorder`, `margin`) are listed before broader ones (`stockout`).

- **Critic:** `criticValidated` is `true` ~93% of the time for data-backed tools
  (matches Ahmer's >90% target); `general`/fallback answers are never badged.
- **Latency:** simulated 700–1600 ms, and the route `await`s it so the typing
  indicator feels real.

---

## How uploaded data drives the app

```
Onboarding upload (.csv/.xlsx)
  → parseUpload()            rows + columns                     (lib/parseUpload.ts)
  → autoDetectMapping()      guess product/units/stock/price    (lib/mapping.ts)
  → [user confirms mapping + currency in the UI]
  → computeDashboard()       real KPIs/ABC/stockout/slow/insights (lib/analytics.ts)
  → useDataStore.setData()   persisted in localStorage           (lib/store.ts)
  → Dashboard reads useDashboardData() → uploaded data or sampleDashboard
  → export.ts                Excel/PDF of whatever is showing     (lib/export.ts)
```

Key points:
- **One render path.** `sampleDashboard` (in `lib/data.ts`) and `computeDashboard`
  output the same `DashboardData` shape, so the Dashboard doesn't branch on source.
- **Small persistence.** The store keeps the *computed* `DashboardData` (aggregates
  + top-N lists), not raw rows — safe for localStorage, survives refresh.
- **Robust to any schema.** Auto-mapping guesses columns by name; the user can
  correct via dropdowns. Required fields: Product + Units sold. Missing optional
  fields (stock/price/cost) degrade gracefully (cards show "—" with a hint).
- **Currency-aware.** Chosen in onboarding (₹/$/€/£), threaded through analytics + UI.
- **Known limit:** the **Assistant** mock still answers from sample data (it's
  server-side; wiring uploaded metrics into `businessContext` is a listed next step).
  Only the **Dashboard** currently reflects the upload.

---

## Commands

Run all of these from the app root:
`~/Documents/Claude/Applied Product Management/smartops-app/`

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (first-time setup; ~425 packages) |
| `npm run dev` | Start dev server (Turbopack) at **http://localhost:3000** |
| `npm run build` | Production build — run before deploying; catches type/build errors |
| `npm run start` | Serve the production build locally (after `npm run build`) |
| `npm run lint` | ESLint (`next/core-web-vitals` + `next/typescript`) |
| `npx tsc --noEmit` | Full TypeScript typecheck (dev mode only checks touched files) |

**No `.env.local` needed** to run the mock. Try: "Which SKUs are about to run out?"

**Definition of "green" before committing/deploying:** `npm run build` succeeds
**and** `npx tsc --noEmit` exits 0. Dev-mode compilation is more lenient than
`build`, so always run `build` before shipping.

---

## Environment variables & configuration

None are required for the mock. They only matter when Ahmer's real pipeline is
wired in. Documented in `.env.local.example`:

| Var | When used | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Option 1 — Ahmer's LLM runs inside the route | `sk-ant-...`; never commit |
| `ASSISTANT_BACKEND_URL` | Option 2 — route proxies to Ahmer's service | e.g. `https://.../query` |

- Local secrets go in `.env.local` (git-ignored). **Never hardcode keys.**
- On Vercel, set these in **Project → Settings → Environment Variables** (same
  pattern as claro-app).

### Config files (all at app root)
| File | Purpose / notable settings |
|---|---|
| `tsconfig.json` | strict mode; path alias **`@/*` → project root** (so `@/lib/data`, `@/components/Sidebar`); `moduleResolution: bundler`; `target ES2017` |
| `tailwind.config.ts` | v3; `content` globs `app/`, `components/`, `lib/`; **custom `brand` color** = `#1d4ed8` (`brand-dark` `#1e40af`, `brand-light` `#3b82f6`) |
| `postcss.config.mjs` | `tailwindcss` + `autoprefixer` plugins (Tailwind v3 style) |
| `next.config.mjs` | empty (`export default {}`) — no custom config needed |
| `eslint.config.mjs` | flat config extending Next presets |
| `.gitignore` | ignores `node_modules`, `.next`, `.env*`, `next-env.d.ts`, `*.tsbuildinfo` |

---

## Dependencies (exact, as installed Jul 11 2026)

**Runtime:** `next@16.2.9`, `react@^19.0.0`, `react-dom@^19.0.0`,
`recharts@^2.15.3` (installed 2.15.4), `lucide-react@^0.511.0`, `clsx@^2.1.1`,
`tailwind-merge@^3.6.0`, `zustand@^5.0.5` (now used — the data store), `xlsx@^0.18.5`
(SheetJS — parses the `.csv`/`.xlsx` upload **and** writes the Excel export),
`jspdf@^4.2.1` + `jspdf-autotable@^5.0.8` (PDF report export).

**Dev:** `typescript@^5`, `tailwindcss@^3.4.19`, `autoprefixer@^10.5.0`,
`postcss@^8.5.15`, `eslint@^9`, `eslint-config-next@16.2.9`,
`@eslint/eslintrc@^3`, `@types/{node@^20,react@^19,react-dom@^19}`.

Notes:
- **`zustand` and `clsx`/`tailwind-merge` are carried over from the Claro stack
  but not yet used** — kept so the shared conventions match and to avoid a
  reinstall when Dashboard/Chat state grows. Safe to remove if you want a lean
  tree.
- **Recharts is 2.x** (deprecation warning on install) — same as Claro; fine for
  a class prototype. v3 migration is optional future work.
- `npm install` reports **2 moderate transitive advisories** (from the Recharts
  2.x line). Harmless for coursework; don't `npm audit fix --force` (breaking).

---

## Code conventions & style

Match these when adding to the app so it stays consistent:

- **Components:** function components, TypeScript, explicit prop interfaces
  (`{ ... }: { ... }`). Small helper components (e.g. `KpiCard`, `Row`, `Metric`)
  live in the same file as the page that uses them; only genuinely shared UI goes
  in `components/`.
- **Server vs client:** pages are **Client Components** (`"use client"` at top)
  when they use state/effects/Recharts (`page.tsx`, `dashboard`, `alerts`,
  `onboarding`, `Sidebar`). The **API route and `layout.tsx` are server** by
  default. `lib/mock.ts` and `lib/data.ts` are framework-agnostic modules.
- **Imports:** use the `@/` alias, not deep relative paths (`@/lib/data`, not
  `../../lib/data`).
- **Styling:** Tailwind utility classes inline. Use the **`brand`** color token
  for primary blue (`bg-brand`, `text-brand`, `hover:bg-brand-dark`) rather than
  raw hex, so a rebrand is one config change. Slate scale for neutrals, emerald
  for the Critic/positive states, red/amber for risk.
- **Icons:** `lucide-react`, sized ~14–20px.
- **Answers/markdown:** assistant responses are markdown strings rendered by
  `components/Markdown.tsx` (supports `**bold**`, `- lists`, and `| pipe tables |`
  with a `---` separator row). If you add new markdown syntax to mock answers,
  extend that renderer.
- **Data:** never inline business numbers in a screen — add them to `lib/data.ts`
  and import, so all screens stay in sync.

---

## Deployment

### GitHub — ✅ DONE (Jul 11, 2026)
- Repo: **https://github.com/mayankdev9/smartops-app** (public, `main`)
- Initial commit `4ca6c0a`. Credentials cached in macOS keychain (classic PAT,
  `repo` scope) — future `git push` works without re-auth.
- Local identity for this repo: `Mayank Dev <mayank@smartops.ai>` (branded, matches
  the Claro convention; set locally, not global).

### Vercel — ✅ DONE (Jul 11, 2026)
- **Live URL: https://smartops-agent.vercel.app**
- Vercel team: `mayankdev` (Hobby/free). Project name: `smartops-agent` (renamed
  from `smartops-app`). Imported `mayankdev9/smartops-app`, Next.js auto-detected,
  root `./`, **no env vars** (mock needs none).
- **Every push to `main` now auto-deploys** (GitHub↔Vercel integration).
- Verified in production: all 4 pages 200; live `/api/assistant` routes correctly
  (stockout/kpi/forecast) with working `criticValidated` flag.

> ⚠️ **Domain history:** `smartops-app.vercel.app` was taken by an unrelated company
> ("SmartOps Health"), so the first deploy auto-assigned `smartops-app-six`. Renamed
> the project to `smartops-agent` and added `smartops-agent.vercel.app` as a
> Production domain (Settings → Domains). Both `smartops-agent` and the legacy
> `smartops-app-six` resolve; **`smartops-agent` is the canonical URL to share.**
> Note: the GitHub *repo* is still named `smartops-app` — only the Vercel project
> and public domain were renamed.

> Production build verified locally (`npm run build` clean) before every push.

---

## Troubleshooting & gotchas

- **Dashboard's first load is slow (~5s).** Normal — Recharts compiles on first
  visit in dev. Fast afterward; not an issue in production build.
- **Port 3000 in use.** Another dev server is running; kill it or Next will offer
  3001. Check with `lsof -i :3000`.
- **Blank charts / "width(0) height(0)" warning.** Recharts needs a sized parent;
  every chart here is wrapped in `<ResponsiveContainer>` with an explicit `height`.
  Keep that pattern.
- **`useRouter`/`usePathname` errors.** They only work in Client Components — the
  file must start with `"use client"`.
- **Changing mock answers.** Edit `lib/mock.ts` (the `MOCKS` array). Keep numbers
  aligned with `lib/data.ts` or the demo will contradict itself.
- **Adding a screen.** Create `app/<route>/page.tsx`, then add it to the `NAV`
  array in `components/Sidebar.tsx` — the shell and active-state highlighting are
  automatic.

---

## Verification (Jul 11, 2026)

- All 4 routes serve HTTP **200**, no console errors
- `/api/assistant` returns correct `toolUsed` / `criticValidated` / `latencyMs`
  across stockout, kpi, forecast queries
- **`npx tsc --noEmit` passes clean (exit 0)**

---

## Design decisions worth remembering

1. **One endpoint, mock-first.** Building against a mock that mirrors Ahmer's
   response shape means the UI is 100% done before his pipeline exists, and the
   swap-in is a single-file change. This is the whole point of Mayank's role.
2. **Shared shell via root layout.** Sidebar lives in `app/layout.tsx`, so every
   route gets nav for free; pages are just the content pane.
3. **Single data source.** `lib/data.ts` keeps every screen telling the same story.
4. **No markdown dependency.** `components/Markdown.tsx` handles bold/lists/tables
   in ~120 lines — keeps the bundle lean and avoids a dep for a demo.
5. **Critic badge is the hero UI element.** It shows up in the sidebar, on every
   Chat answer, and on every alert — it's the product's differentiator, so it's
   visually everywhere.

---

## ▶ STATUS (Jul 15, 2026 — CONSOLIDATED: real backend wired to the new UI)

✅ **ONE canonical version:** `github.com/mayankdev9/smartops-app` → **https://smartops-agent.vercel.app**
= our **new UI** + **Ahmer's real 5-LLM + Critic backend**. The divergence is resolved.

### How the backend got connected (Jul 15)
Ahmer decoupled his pipeline into a standalone **FastAPI** repo (`github.com/ahmer64-sketch/smartops-backend`, `POST /assistant`) that matches our contract exactly. Steps taken:
1. **Forked** it → `github.com/mayankdev9/smartops-backend`.
2. **Deployed on Render** as a Web Service — **live at `https://smartops-backend-mwof.onrender.com`**.
   - Runtime Python 3, build `pip install -r requirements.txt`, start `uvicorn server:app --host 0.0.0.0 --port $PORT`.
   - Env vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (both required or it won't boot).
   - **Instance: Standard (2 GB RAM)** — the 512 MB Starter tier OOM'd loading the 30 MB `Customer Data.xlsx`; 2 GB fixed it.
3. **Our `/api/assistant`** now proxies to it via **`ASSISTANT_BACKEND_URL=https://smartops-backend-mwof.onrender.com/assistant`** (set in Vercel, Production+Preview). Redeployed.
   - Verified directly: backend `/health` = ok; a real query → `toolUsed: sku_tool`, `criticValidated: true`, ~8.5 s, real answer (WTPSET10BKNYGRS, 210 units, ₹153,647.29).

**Backend's 7 tools (drives what the Assistant answers well):** `revenue_tool`, `geography_tool` (by state), `returns_tool`, `payment_tool`, `seasonality_tool`, `kpi_dashboard_tool`, `sku_tool`. It's a **sales-analytics agent** over the multi-channel `Customer Data.xlsx` (revenue ₹524M total, Maharashtra top state, etc.) — NOT inventory/stockout-oriented like our old mock. The Assistant's suggested prompts + `TOOL_LABELS` are matched to these. Response format: **Summary / Risks / Actions / Confidence** (markdown). Latency ~5–9 s. Answers ignore our `businessContext` for now (uses its own static data) — wiring the uploaded dashboard into `businessContext` is a future enhancement.

### ⚠️ TODO / follow-ups
- **🔑 ROTATE THE API KEYS** (still open) — both keys were shown in a Render screenshot during setup. Regenerate Anthropic (console.anthropic.com) + OpenAI (platform.openai.com), update the two values in Render → Environment.
- **Brief Ahmer on backend changes** (still open) — Critic fix (what he asked for) + length-cap removal + template relaxation, all in the fork + live on Render. Draft WhatsApp message was prepared; his call if he wants lengths tuned differently.
- **Retire `smartops-app-five.vercel.app`** (Ahmer's old separate deploy) — everyone uses `smartops-agent` now.
- **Done Jul 15 (front-end):** feedback batch 1 (landing/flow), batch 2 (interactive dashboard + business health), batch 4 (repositioning to "AI General Manager"), tuned suggested prompts to the live backend.
- **Done Jul 15 (backend, in fork):** Critic re-validation fix (badge works), length caps removed, format template relaxed — all verified live end-to-end.
- **Still to do:** feedback **batch 3** — Alerts page (colorful redesign + critical/normal prioritization + "Generate PO") — and a **Help/FAQ** support surface.
- **⏸ PAUSED (Jul 15 evening):** Mayank has additional feedback to give on resume — **ask him for it first thing next session.**
- Render **Standard is ~$25/mo**; if optimizing later, convert the 30 MB Excel to parquet/csv so it fits a smaller instance.
- **Resume feedback batch 3** (Alerts redesign + Generate PO) + add a **Help/FAQ** — the last of the class/prof feedback. (Batch 4 repositioning already done.)

### Feedback UI work done so far (Jul 15) — all pure UI, seam untouched
- ✅ **Batch 1** (`7c0981f`): default landing = **Dashboard** (`/`→`/dashboard`); chat moved to `/assistant`; sidebar reordered to customer-journey flow.
- ✅ **Batch 2** (`f6efe5c`): **Business Health hero** (Healthy/Watch/Action-needed + top priority); **clickable SKUs** on reorder list + slow-movers → `SkuDrawer` detail panel.
- ⏸ **Batch 3** (Alerts redesign + Generate PO) and **Batch 4** (reposition assistant + Help/FAQ) — **NOT started**, paused pending the Ahmer/consolidation decision so we don't diverge further.
- **Locked value prop:** *"An AI General Manager for small distributors"* — sub-line: *"Runs your operations, flags what's urgent, and tells you what to do next — every answer validated before you act."* (to thread into Assistant/sidebar/onboarding in batch 4).

**Rollback safety:** current HEAD tagged `feedback-ui-v1` (local) — the pre-consolidation UI state, if we ever need to revert.

**Prior enhancement batches (Jul 11), all shipped & live:** mobile nav · proactive insights · chat persistence · reorder/margin tools · real `.csv`/`.xlsx` upload driving the Dashboard (auto column-mapping + currency) · Excel + PDF export.

## Next steps (enhancements)

Done in the Jul 11 enhancement pass (Batch 1):
- [x] Deploy to Vercel — live at https://smartops-agent.vercel.app
- [x] Mobile responsiveness — sidebar → hamburger drawer on small screens
- [x] Proactive insight cards on the Dashboard (derived from `lib/data.ts`)
- [x] Chat history persistence (localStorage) + Clear button
- [x] 2 more assistant capabilities: `reorder` (reorder plan), `margin` (margins)

Done in Batch 2 (Jul 11):
- [x] Real .csv/.xlsx upload parsing (SheetJS) with detected columns + preview + error states

Done in Batch 3 (Jul 11):
- [x] Uploaded file **drives the Dashboard** — column mapping (auto + manual), currency picker, real computed KPIs/ABC/stockout/slow-movers/insights, data-source banner + reset
- [x] **Excel + PDF export** of the report from the Dashboard

Still open:
- [ ] Wire Ahmer's real 5-LLM pipeline behind `/api/assistant` (pick option 1 or 2) — **deferred by Mayank; do later**
- [ ] Make the **Assistant** answers reflect uploaded data too (currently only the Dashboard does; the mock is server-side and still uses sample) — would pass computed metrics in `businessContext`
- [ ] Revenue-trend chart for uploads needs a date column (currently shows a hint) — parse dates + aggregate by day
- [ ] Actually *send* the daily alert (needs email/WhatsApp API + scheduler) — needs external setup
- [ ] Auth / multi-tenant — overkill for the class demo; parked

---

## Session log

**NEW FEEDBACK (from meeting, given Jul 16):**
1. ✅ **Alerts tab redesign** (commit `eca7f44`) — removed the messages/digest interface; added a full-screen grid of clickable alert categories (Generate PO, Stock-outs, Shipping, etc.), data-driven where the uploaded data supports it. `lib/alerts.ts` + `lib/export.ts:exportPO` + rewritten `app/alerts/page.tsx`.
2. ⏳ **Company accounts + shared data warehouse (DO LAST):** company sets up an account → admin adds users (IDs/passwords) → a central store so all employees of a company share the same uploaded data (no duplicate uploads). This is real multi-tenant auth + shared storage — big build, explicitly "can be done last."
   - Note: `Group Project/Feedbacks_2.docx` is byte-identical to the original `Feedbacks on SmartOps.docx`; the genuinely new items are these two verbal points.


| Date | Work |
|---|---|
| Jul 11, 2026 | Scaffolded app (Next.js 16, Claro stack); built mock `/api/assistant` + `lib/mock.ts`; shipped Chat/Assistant screen wired end-to-end; verified. |
| Jul 11, 2026 | Completed MVP: Sidebar nav + shared shell, Dashboard (Recharts), Daily Alert (WhatsApp/email), Onboarding; centralized `lib/data.ts`; all routes 200, clean typecheck. |
| Jul 11, 2026 | Verified production build (`npm run build` clean); `git init` + initial commit; pushed to new public GitHub repo `mayankdev9/smartops-app` (new classic PAT after old one expired Jul 4). Next: Vercel import. |
| Jul 11, 2026 | **Deployed to Vercel.** First auto-domain was `smartops-app-six` (`smartops-app.vercel.app` taken by unrelated "SmartOps Health"). Renamed Vercel project to `smartops-agent` + added **https://smartops-agent.vercel.app** as Production domain. Verified live: all pages 200, `/api/assistant` works with Critic flag. Auto-deploy on push enabled. **Evening deadline met.** |
| Jul 11, 2026 | **Enhancement Batch 1** (commits `87b1786`, `7a1ee23`): mobile-responsive sidebar drawer; proactive insight cards on Dashboard; chat persistence + Clear; added `reorder` & `margin` assistant tools; fixed `slow` regex so all 6 suggestion chips route correctly. Built clean, pushed, auto-deployed, verified live (all 7 tools route). |
| Jul 11, 2026 | **Enhancement Batch 2** (commit `8df9f5d`): real `.csv`/`.xlsx` upload parsing in Onboarding via SheetJS (`lib/parseUpload.ts`) — detected columns + row count + preview table + spinner/error states. Validated both formats parse (Node smoke test). Added `xlsx` dep. |
| Jul 15, 2026 | **Feedback pass** started (commit `7c0981f`): default landing = **Dashboard** (`/` → `/dashboard`); Chat moved to **`/assistant`** (end of flow); sidebar reordered to the customer-journey sequence. Per class/prof feedback (`Group Project/Feedbacks on SmartOps.docx`). API seam untouched. **Note:** Ahmer's backend connection is not in this repo — verified our repo + live deploy are still the mock. |
| Jul 15, 2026 | **Feedback batch 2** (commit `f6efe5c`): Business Health hero + clickable SKUs → `components/SkuDrawer.tsx` detail panel; `businessHealth()` in analytics. |
| Jul 15, 2026 | **Divergence discovered:** Ahmer's real backend is live at **`smartops-app-five.vercel.app`** (separate deploy, OLD front-end). Ours (`smartops-agent`) has the new UI + mock. Sent WhatsApp asking Ahmer for his `/api/assistant` change + backend URL to consolidate onto one repo. **Paused batches 3–4** until he replies. Tagged `feedback-ui-v1`. Synced both CLAUDE.md files. |
| Jul 15, 2026 | **CONSOLIDATED ✅** Ahmer gave us his backend as a standalone FastAPI repo. Wired `/api/assistant` to proxy to `ASSISTANT_BACKEND_URL` (commit `e788b71`). Forked `smartops-backend` → deployed on **Render** (2 GB Standard) at `smartops-backend-mwof.onrender.com`. Set the env var in Vercel + redeployed. **Verified live end-to-end:** `smartops-agent.vercel.app` now returns real answers (`sku_tool`, ~5s, WTPSET10BKNYGRS). One canonical version = new UI + real backend. TODO: rotate API keys (screenshot-exposed), retire `smartops-app-five`, resume batches 3–4. |
| Jul 15, 2026 | **Feedback batch 4 (repositioning)** (commit `63ac805`): reframed the Assistant + sidebar + page metadata to the locked value prop — **"An AI General Manager for small distributors"** / *"Your AI General Manager — runs your operations, flags what's urgent... validated before you act."* Drops the "ChatGPT for your ERP" framing per prof. Copy-only. |
| Jul 16, 2026 | **Assistant charts** (commit `30fff94`): render the backend's `chart` JSON in the Assistant (`components/AssistantChart.tsx`, Recharts bar/line). **Finding on Ahmer's "new backend":** his upstream (`ahmer64-sketch/smartops-backend`) only added one commit, "Remove word/length caps" — the same change we already made; **our fork is ahead** (also has the Critic re-validation fix his lacks). Charts were never new — backend always returned Recharts-ready chart JSON; our FE just didn't render it. So the only thing to incorporate was FE chart rendering (done); no backend swap. ("Faster" he saw ≈ our more-verbose template; can trim if we want speed over comprehensiveness.) |
| Jul 16, 2026 | **Onboarding "close the loop"** (commit `5b71218`): added a "biggest headache" question in step 1; final step is now a **Diagnosis** (business health + computed findings/recommendations from the data, acknowledging the concern) instead of a generic success screen. Closes the professor's onboarding gap (#2 of the feedback audit). |
| Jul 16, 2026 | **Help & FAQ page** (commit `3c30b65`): new `/help` route — support options (in-app chat/email/help center) + accordion FAQ; added "Help" sidebar tab. Addresses the customer-support feedback. |
| Jul 16, 2026 | **Alerts redesign** (commit `eca7f44`): replaced the digest/messages UI with a full-screen grid of 8 clickable alert categories + priority color-coding + Generate PO (real PO PDF). `lib/alerts.ts` derives PO/stockout/slow/demand from the live dashboard data; Shipping/Returns/Payments/Margins are sample. Sidebar "Daily Alert" → "Alerts". Next feedback items: multi-tenant company accounts + shared data (do last); Help/FAQ. |
| Jul 15, 2026 | **Tuned Assistant suggested prompts** (commit `2cf9caa`) to the live backend's real tools (revenue, geography, returns, seasonality, KPIs) — all 5 verified live before shipping. Added clean `TOOL_LABELS` for his tool ids. Prepared before team demo. |
| Jul 15, 2026 | **BACKEND fixes (in the fork `mayankdev9/smartops-backend`, deployed on Render):** (1) `6ff9307` **Critic fix** — Ahmer reported "check bot not working"; root cause = critic validated the *first draft*, then the improve-retry rewrote the answer without re-validating, so `criticValidated` stayed False. Fix: re-run `_critic_check` on the improved answer. Verified: 0/3 True before → 12/14 True after. (2) `849590d` **length caps removed** (max_tokens 250/300→2000, "160 words" dropped from prompt + critic check, data window 3000→8000). (3) `a075bc2` **format template relaxed** — the "2-3 sentences/2 bullets" template was the real length driver, not the caps; summary now scales with question breadth. Verified end-to-end: "Tell me about this data" → 169-word comprehensive KPI answer, critic=True, 8.2s. **⚠️ Ahmer not yet briefed on changes 2–3 (length) — his backend, give him a heads-up.** |
| Jul 11, 2026 | **Enhancement Batch 3** (commits `0d8b3c3`, `e294315`): uploaded file now **drives the Dashboard** — new `lib/mapping.ts` (auto-detect columns), `lib/analytics.ts` (`computeDashboard`), `lib/store.ts` (zustand, persisted); Onboarding column-mapping UI + currency; Dashboard renders sample-or-uploaded via `useDashboardData()` with banner/reset/empty-states. Plus **Excel + PDF export** (`lib/export.ts`, +`jspdf`/`jspdf-autotable`). Verified: analytics + export via Node, typecheck, build, live. |

---

*Last updated: 2026-07-11*
