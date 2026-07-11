// Mock engine for SmartOps — mimics Ahmer's backend response types so the
// front-end can be built and demoed before the real 5-LLM pipeline is wired in.
//
// The API route (app/api/assistant/route.ts) calls getMockResponse(). When
// Ahmer's real pipeline drops in behind POST /api/assistant, this file is the
// ONLY thing that gets removed — the Chat UI never changes.

export type ToolId = "stockout" | "slow" | "abc" | "forecast" | "kpi" | "general";

export interface AssistantResponse {
  answer: string; // markdown/HTML body
  criticValidated: boolean; // drives the "✓ Critic validated" badge
  toolUsed: ToolId;
  latencyMs: number;
}

interface MockDef {
  tool: ToolId;
  // keywords that route a user message to this tool
  match: RegExp;
  answer: string;
}

// --- Canned responses, written in the voice Ahmer's assistant would use ---
const MOCKS: MockDef[] = [
  {
    tool: "stockout",
    match: /stock ?out|run ?out|running low|reorder|out of stock|low stock|risk this week/i,
    answer: `**3 SKUs are at risk of stockout in the next 7 days:**

| SKU | On hand | Avg daily sales | Days left | Suggested reorder |
|---|---|---|---|---|
| **Coca-Cola 500ml** | 48 units | 22/day | **2.2 days** | 600 units |
| **Lay's Classic 45g** | 90 units | 31/day | **2.9 days** | 900 units |
| **Dettol Soap 4-pack** | 35 units | 9/day | **3.9 days** | 250 units |

⚠️ **Coca-Cola 500ml** is the most urgent — at the current sell-through you'll be empty by **Thursday**. Based on your supplier's 2-day lead time, place this order **today** to avoid lost sales over the weekend.`,
  },
  {
    tool: "slow",
    match: /slow ?mover|slow ?moving|frozen capital|dead stock|not selling|sitting|tied up|gathering dust/i,
    answer: `**You have ₹1.84L (~$2,200) of frozen capital in slow-movers.** These 4 SKUs haven't moved meaningfully in 60+ days:

| SKU | Units held | Value | Last sale | Days idle |
|---|---|---|---|---|
| **Imported Olive Oil 1L** | 60 | ₹72,000 | 74 days ago | 74 |
| **Diet Energy Drink 250ml** | 210 | ₹41,000 | 68 days ago | 68 |
| **Premium Green Tea 100ct** | 45 | ₹38,000 | 61 days ago | 61 |
| **Sugar-free Cookies 200g** | 130 | ₹33,000 | 63 days ago | 63 |

💡 **Recommendation:** Run a clearance bundle on the olive oil and energy drinks (your two heaviest) — freeing even half this capital funds ~2 weeks of your fast-moving Coca-Cola and Lay's reorders.`,
  },
  {
    tool: "abc",
    match: /abc|classif|which products matter|80\/20|pareto|category a|top products by/i,
    answer: `**ABC classification across your 27 active SKUs** (by revenue contribution):

- **Class A — 5 SKUs → 71% of revenue.** Coca-Cola 500ml, Lay's Classic 45g, Parle-G 800g, Amul Milk 1L, Dettol Soap. Never let these stock out — tighten reorder points.
- **Class B — 8 SKUs → 21% of revenue.** Steady performers; review reorder levels monthly.
- **Class C — 14 SKUs → 8% of revenue.** Long tail. Several overlap with your slow-movers — candidates to de-list or reduce order quantities.

🎯 **Takeaway:** Your top **5 SKUs drive nearly 3/4 of the business.** Protecting their availability matters far more than tracking the other 22 equally.`,
  },
  {
    tool: "forecast",
    match: /forecast|next 30|next month|demand|predict|projection|expect to sell|how much will/i,
    answer: `**30-day demand forecast for your Class A SKUs** (based on 90 days of history + weekday seasonality):

| SKU | Last 30d actual | Next 30d forecast | Trend |
|---|---|---|---|
| **Coca-Cola 500ml** | 640 units | **710 units** | ↑ 11% |
| **Lay's Classic 45g** | 910 units | **965 units** | ↑ 6% |
| **Parle-G 800g** | 420 units | **405 units** | ↓ 4% |
| **Amul Milk 1L** | 1,180 units | **1,240 units** | ↑ 5% |

📈 Beverages and snacks are trending **up into the summer** — pre-book ~10% extra Coca-Cola and Lay's for next month. Parle-G is softening slightly; hold your order flat.`,
  },
  {
    tool: "kpi",
    match: /kpi|how('?s| is) (the |my )?business|dashboard|overview|summary|numbers|metrics|health|how are we doing/i,
    answer: `**Business snapshot — last 30 days:**

- 💰 **Revenue:** ₹8.4L (~$10,100) — **↑ 7%** vs. prior 30 days
- 📦 **Units sold:** 12,340 across 27 SKUs
- 🧊 **Frozen capital:** ₹1.84L tied up in slow-movers (**down** from ₹2.1L)
- ⚠️ **Stockout risk:** 3 SKUs need reordering this week
- 🔄 **Inventory turns:** 4.2× (healthy for FMCG general-trade)
- 🏆 **Top SKU:** Amul Milk 1L (1,180 units)

You're **growing and turning inventory well.** The one thing to act on today: reorder the 3 at-risk SKUs before the weekend.`,
  },
];

const GENERAL: MockDef = {
  tool: "general",
  match: /.*/,
  answer: `I can help you run your operations in plain English. Try asking me about:

- **Stockout risk** — "Which SKUs are about to run out?"
- **Slow-movers** — "Where is my capital frozen?"
- **ABC analysis** — "Which products actually matter?"
- **Demand forecast** — "How much Coca-Cola will I sell next month?"
- **Business KPIs** — "How's the business doing?"

What would you like to look at?`,
};

function pickMock(message: string): MockDef {
  return MOCKS.find((m) => m.match.test(message)) ?? GENERAL;
}

/**
 * Simulates Ahmer's pipeline: routes the query to a "tool", returns a canned
 * answer, and mimics the Critic LLM by validating >90% of the time.
 */
export function getMockResponse(message: string): AssistantResponse {
  const mock = pickMock(message);

  // Critic LLM passes ~93% of the time (matches Ahmer's >90% target).
  // General/fallback answers aren't data-backed, so we don't badge them.
  const criticValidated = mock.tool !== "general" && Math.random() > 0.07;

  // Realistic pipeline latency: 700–1600ms.
  const latencyMs = Math.round(700 + Math.random() * 900);

  return {
    answer: mock.answer,
    criticValidated,
    toolUsed: mock.tool,
    latencyMs,
  };
}
