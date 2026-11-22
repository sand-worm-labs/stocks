import type { AttentionItem, Idea } from "@/lib/home/types"

export const attentionMockData: AttentionItem[] = [
  {
    id: "confirm-rules",
    tone: "warning",
    title: "AI chips, max 25%",
    detail: "Confirm the rules to start the research.",
    action: { label: "Confirm rules", route: "rules", slug: "ai-chips-25" },
  },
  {
    id: "stop-loss",
    tone: "negative",
    title: "Robotics, capped at 20%",
    detail: "TSLAc is down 3.5% this week. Your stop-loss is off.",
    action: { label: "Review", route: "portfolio", slug: "robotics-20" },
  },
  {
    id: "weekend-gap",
    tone: "info",
    title: "Weekend gap",
    detail: "NVDAc trades 0.6% above the NVIDIA share price while the stock market is closed.",
    action: { label: "See why", route: "stock", slug: "NVDAc" },
  },
]

export const ideasMockData: Idea[] = [
  { id: "ai-5y", title: "AI for 5 years, no oil", hint: "Long-term growth" },
  { id: "big-tech", title: "Big tech, equal weight", hint: "Simple, steady" },
  { id: "protect", title: "Protect my capital", hint: "Mostly cash, small bets" },
]
