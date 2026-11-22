import type { Activity, TradeReceipt } from "@/lib/activity/types"

const PORTFOLIO = "robotics-20"

const buy = (symbol: string, units: number, price: number, tx: string, impact: number): Activity => {
  const trade: TradeReceipt = { symbol, side: "buy", spend: 75, units, price, fee: 0.225, impact, tx }
  return {
    id: `bought-${symbol}`,
    portfolioId: PORTFOLIO,
    kind: "bought",
    title: `Bought ${symbol}`,
    detail: "First buy of the basket: 4 stocks, 75 USDC each. Every trade passed the rules first.",
    at: "2026-11-18T15:31:00",
    trade,
  }
}

export const activityMockData: Activity[] = [
  {
    id: "rules-checked",
    portfolioId: PORTFOLIO,
    kind: "checked",
    title: "Checked your rules",
    detail: "All 4 hold. The biggest stock is NVDAc at 15.5%, under your 20% cap.",
    at: "2026-11-20T09:00:00",
    checks: { passing: 4, total: 4 },
  },
  {
    id: "rebalance-skipped",
    portfolioId: PORTFOLIO,
    kind: "checked",
    title: "Rebalance not needed",
    detail: "No stock drifted past 17%, so nothing was sold or bought.",
    at: "2026-11-20T09:00:00",
  },
  {
    id: "tsla-alert",
    portfolioId: PORTFOLIO,
    kind: "alert",
    title: "Price alert",
    detail: "TSLAc is down 3.5% this week and 4.8% under what you paid. Stop-loss is off.",
    at: "2026-11-20T08:12:00",
    action: { label: "Review", route: "portfolio", slug: PORTFOLIO },
  },
  {
    id: "trade-refused",
    portfolioId: PORTFOLIO,
    kind: "refused",
    title: "Refused a trade",
    detail: "Rule 2 stops any one stock going over 20%. A chat message can't change a locked rule.",
    at: "2026-11-19T18:40:00",
    rule: "Rule 2 · max 20% per stock",
    request: "Put 40% in Tesla.",
    action: { label: "Change rules", route: "adapt", slug: PORTFOLIO },
  },
  {
    id: "weekend-gap",
    portfolioId: PORTFOLIO,
    kind: "gap",
    title: "Weekend gap",
    detail: "NVDAc trades 0.6% above the share price while US markets are shut. The agent won't buy above 1%.",
    at: "2026-11-19T11:05:00",
  },
  buy("NVDAc", 0.5161, 145.32, "0x9f2c41d7b3a85e60c1f4d9a27be38c5d1a6f0e47c92b8d3516a4f7e0b2c9a41e", 0.0002),
  buy("AMZNc", 0.2915, 257.29, "0x3be7a09d5c1482f6e8a7b3d04c95f1e26a8d7b0c3e5914f2a6d8c7b1e0f94a52", 0.0002),
  buy("GOOGLc", 0.2737, 274.02, "0x71d4c8e2a5f9306b1d7e84c3a2f5b9608e1d4a7c3f0b5926e8d1a4c7f3b0e968", 0.0003),
  buy("TSLAc", 0.2021, 371.1, "0xc58a1f3e7d4b9206a8c5e1f7d3b40a96e2c8f5d1b7a3094e6c2f8a5d1b7e3c04", 0.0004),
  {
    id: "adapted",
    portfolioId: PORTFOLIO,
    kind: "adapted",
    title: "Built a less-risk version",
    detail: "Each stock 20% → 15%, cash 20% → 40%. Worst drop −29.8% → −17.4%. Research was reused.",
    at: "2026-11-18T15:20:00",
    action: { label: "Report →", route: "report", slug: PORTFOLIO },
  },
  {
    id: "report-ready",
    portfolioId: PORTFOLIO,
    kind: "report",
    title: "Strategy report ready",
    detail: "Some edge, mostly market risk. Beat the S&P 500 in the backtest, past your −20% drop.",
    at: "2026-11-18T15:12:00",
    action: { label: "Report →", route: "report", slug: PORTFOLIO },
  },
  {
    id: "rules-locked",
    portfolioId: PORTFOLIO,
    kind: "locked",
    title: "Rules locked",
    detail: "4 rules for Robotics, capped at 20%. Every trade is checked against them first.",
    at: "2026-11-18T15:10:00",
    checks: { passing: 4, total: 4 },
  },
]
