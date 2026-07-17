// Fast-path replies for greetings and other conversational "gestures".
//
// Ahmer's 5-LLM + Critic pipeline is built for operational questions, not small
// talk — so "Hi" used to get sent through the whole pipeline and come back empty
// (or slow). This intercepts greetings / thanks / good-byes / "what can you do"
// and answers instantly, on-brand, without touching the heavy backend. Anything
// that isn't clearly a gesture falls through to the real pipeline unchanged.

export interface SmallTalk {
  answer: string;
  toolUsed: string; // "general" → no tool chip, no Critic badge in the UI
  criticValidated: boolean;
}

const GREETING =
  /^(hi+|hey+|hello+|ola|hola|yo|hiya|howdy|namaste|namaskar|sup|wass?up|what'?s\s+up|greetings|good\s+(morning|afternoon|evening|day))\b/i;
const THANKS =
  /^(thanks|thank\s*you|thx|ty|much\s+appreciated|appreciate\s+it|great|awesome|perfect|nice|cool|amazing|brilliant|got\s+it|makes\s+sense|good\s+(job|stuff|work)|well\s+done)\b/i;
const BYE = /^(bye|goodbye|see\s+you|see\s+ya|catch\s+you\s+later|later|good\s*night|gn)\b/i;
const CAPABILITIES =
  /(what\s+can\s+you\s+(do|help|answer)|what\s+do\s+you\s+do|who\s+are\s+you|what\s+are\s+you|how\s+(can|do)\s+you\s+help|what\s+can\s+i\s+ask|how\s+does\s+this\s+work|what\s+is\s+this)/i;

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

const CAPABILITIES_ANSWER = `I'm your **AI General Manager** — I read your sales and operations data and tell you what's happening and what to do next. You can ask me things like:

- **Revenue** — "Which products bring in the most revenue?"
- **Geography** — "Which states or cities drive the most sales?"
- **Returns** — "What's my return rate, and which products get returned most?"
- **Seasonality** — "How do my sales change by season?"
- **KPIs** — "Give me an overall business summary"
- **Stock & slow-movers** — "What's at risk of stocking out?" (when your file has inventory)

I answer from **your uploaded data** when it's connected, and every answer is checked by the **Critic** before you see it. What would you like to know?`;

/** Returns an instant reply for a greeting/gesture, or null to defer to the pipeline. */
export function getSmallTalk(rawMessage: string): SmallTalk | null {
  const msg = (rawMessage ?? "").trim();
  if (!msg) return null;
  const clean = msg.replace(/[!.?,]+$/g, "").trim();
  const gen = (answer: string): SmallTalk => ({ answer, toolUsed: "general", criticValidated: false });

  // "What can you do / who are you / help" — allow longer phrasings.
  if (CAPABILITIES.test(clean) || /^help$/i.test(clean)) return gen(CAPABILITIES_ANSWER);

  // The rest are only treated as gestures when the message is short, so a real
  // question that merely starts with one of these words still reaches the pipeline.
  if (wordCount(clean) > 6) return null;

  if (GREETING.test(clean)) {
    return gen(
      `Hi! 👋 I'm your **AI General Manager**. Ask me about your revenue, top products, sales by region, returns, seasonality, or KPIs — for example, *"Which products bring in the most revenue?"* or *"Give me an overall business summary."*`,
    );
  }
  if (THANKS.test(clean)) {
    return gen(`You're welcome! Anything else you'd like to dig into — revenue, returns, top regions, or a full business summary?`);
  }
  if (BYE.test(clean)) {
    return gen(`Anytime. I'll keep an eye on your operations — check back for your daily summary. 👋`);
  }
  return null;
}
