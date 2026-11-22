import type { BriefReview } from "@/lib/brief/types"

export const briefMockData: Record<BriefReview["status"], BriefReview> = {
  ready: {
    text: "Grow 500 USDC with robotics over 3+ years. Max 20% in any one stock, only stocks with $100K+ liquidity on Base. I'd panic at −20%. Ask before buying.",
    portfolioId: "ai-chips-25",
    status: "ready",
    understood: [
      { label: "Goal", value: "Growth", state: "got-it" },
      { label: "Horizon", value: "3+ years", state: "got-it" },
      { label: "Loss you can live with", term: "Max drawdown limit", value: "−20%", state: "got-it" },
      { label: "Budget", value: "500 USDC", state: "got-it" },
      { label: "Include", value: "Robotics", state: "got-it" },
    ],
    questions: [],
    alternatives: [],
  },
  "needs-answers": {
    text: "make me money with ai stocks lol",
    portfolioId: "ai-chips-25",
    status: "needs-answers",
    understood: [
      { label: "Goal", value: "Growth", state: "got-it" },
      { label: "Include", value: "AI companies", state: "got-it" },
      { label: "Budget", value: "Not set", state: "missing" },
      { label: "Loss you can live with", term: "Max drawdown limit", value: "Not set", state: "missing" },
      { label: "Horizon", value: "Not set", state: "missing" },
      { label: "Max in one stock", value: "20% (default)", state: "guess" },
    ],
    questions: [
      {
        id: "budget",
        text: "How much do you want to put in?",
        options: ["100 USDC", "500 USDC", "1,000 USDC", "Other"],
        hint: "You have 0 USDC now; paper trading works with any amount.",
      },
      {
        id: "drawdown",
        text: "How big a fall could you sit through without selling?",
        options: ["−10%", "−20%", "−35%", "Not sure, explain"],
        hint: "The backtest has to stay above this, or I'll flag it.",
      },
      {
        id: "horizon",
        text: "How long will you hold?",
        options: ["Under 1 year", "1–3 years", "3+ years"],
        hint: "Short horizons get less risky mixes.",
      },
    ],
    alternatives: [],
  },
  unrealistic: {
    text: "turn 50 usdc into 1000 by next week",
    portfolioId: "ai-chips-25",
    status: "unrealistic",
    understood: [
      { label: "Budget", value: "50 USDC", state: "got-it" },
      { label: "Goal", value: "Turn 50 into 1,000", state: "unrealistic" },
      { label: "Horizon", value: "1 week", state: "guess" },
    ],
    questions: [],
    concern:
      "20× in a week isn't something any stock portfolio can plan for. Chasing it means betting everything on one move, which is gambling, not investing. Even the best mix in our backtests grew about 30% a year.",
    alternatives: [
      "Grow 50 USDC over 3+ years",
      "Learn with paper trading first",
      "Show me the riskiest mix, with its worst drop",
    ],
  },
}
