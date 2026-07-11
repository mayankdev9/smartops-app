# SmartOps — Operations AI Agent (front-end)

**Course:** MOR-531 Applied Product Management · USC Marshall · Summer 2026
**Team:** Team 5 — Ahmer Rizvi, Paola Whittier, Abdulrahman Almarwan, Mayank Dev
**Owner of this app:** Mayank Dev (front-end / UI/UX + integration seam)
**Location:** `~/Documents/Claude/Applied Product Management/smartops-app/`
**Status:** MVP complete (Jul 11, 2026) — all 5 screens built, verified, running locally

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
│   ├── page.tsx                ← ASSISTANT (Chat) — route "/", the hero
│   ├── dashboard/page.tsx      ← DASHBOARD — KPI cards + Recharts
│   ├── alerts/page.tsx         ← DAILY ALERT — 8 AM WhatsApp/email digest
│   ├── onboarding/page.tsx     ← SETUP & DATA — 3-step onboarding + Excel stub
│   └── api/assistant/route.ts  ← THE INTEGRATION SEAM (mock today, Ahmer later)
├── components/
│   ├── Sidebar.tsx             ← Shared left nav + brand + Critic trust badge
│   └── Markdown.tsx            ← Tiny markdown renderer (bold/lists/tables), no dep
├── lib/
│   ├── mock.ts                 ← Mock engine: routes query→tool, canned answers,
│   │                             fakes Critic pass (~93%) + latency
│   └── data.ts                 ← Shared mock business data (single source of truth)
├── .env.local.example          ← Env var docs (none needed for mock)
└── README.md                   ← Short run/architecture summary
```

---

## Screens (all built ✅)

| Screen | Route | What's there |
|---|---|---|
| **Assistant** (hero) | `/` | Plain-English Q&A, suggested prompts on empty state, per-answer tool label + **"✓ Critic validated"** badge (or "⚠ Needs review"), response time, typing indicator. Wired to `/api/assistant`. |
| **Dashboard** | `/dashboard` | 4 KPI cards; Recharts: revenue **area** chart (14d), ABC **donut**, top-SKU horizontal **bar**; "Reorder now" panel; slow-mover table. |
| **Daily Alert** | `/alerts` | 8 AM digest with a **WhatsApp ⇄ Email** toggle (WhatsApp = phone-style chat mockup, Email = inbox mockup) + delivery-settings card. |
| **Setup & Data** | `/onboarding` | 3-step stepper: business details → Excel/CSV upload **stub** (marks connected on file pick) → success, routes back to Chat. |

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
| `general` | fallback — lists what the assistant can do |

- **Critic:** `criticValidated` is `true` ~93% of the time for data-backed tools
  (matches Ahmer's >90% target); `general`/fallback answers are never badged.
- **Latency:** simulated 700–1600 ms, and the route `await`s it so the typing
  indicator feels real.

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
`tailwind-merge@^3.6.0`, `zustand@^5.0.5`.

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

## Deployment (Vercel) — planned, not yet done

Same flow as claro-app:
1. Push `smartops-app/` to a GitHub repo (its own repo, or a subdir import).
2. On Vercel: **New Project → import the repo** → framework auto-detected as
   Next.js. Root directory = `smartops-app/` if it's a subdir.
3. Add env vars only if the real pipeline is wired (`ANTHROPIC_API_KEY` **or**
   `ASSISTANT_BACKEND_URL`). The mock needs none.
4. Deploy → get a `*.vercel.app` URL (Claro's is `claro-app-three.vercel.app`).
5. Run `npm run build` locally first to catch errors before Vercel does.

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

## ▶ RESUME HERE (paused Jul 11, 2026 — target: finish by this evening)

MVP is complete, verified, and was running locally. Paused mid-afternoon; resuming
in ~1–2 hours. To pick back up:
1. `cd` into the app and run `npm run dev` (server may need restarting after the break).
2. Open http://localhost:3000 and click through all 4 screens.
3. Continue with the enhancements below — **not yet decided which one to start with**;
   confirm priority with Mayank on resume given the evening deadline.

## Next steps (enhancements, not yet started)

- [ ] Wire Ahmer's real 5-LLM pipeline behind `/api/assistant` (pick option 1 or 2)
- [ ] Deploy to Vercel (set `ANTHROPIC_API_KEY` or `ASSISTANT_BACKEND_URL` in env)
- [ ] Real Excel upload handling + AI column mapping (currently a stub)
- [ ] Mobile responsiveness pass (sidebar → drawer on small screens)
- [ ] Richer charts / proactive-insight cards on the Dashboard

---

## Session log

| Date | Work |
|---|---|
| Jul 11, 2026 | Scaffolded app (Next.js 16, Claro stack); built mock `/api/assistant` + `lib/mock.ts`; shipped Chat/Assistant screen wired end-to-end; verified. |
| Jul 11, 2026 | Completed MVP: Sidebar nav + shared shell, Dashboard (Recharts), Daily Alert (WhatsApp/email), Onboarding; centralized `lib/data.ts`; all routes 200, clean typecheck. |

---

*Last updated: 2026-07-11*
