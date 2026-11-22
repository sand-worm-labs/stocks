import type { Portfolio } from "@/lib/portfolios/types"

import { makeSeries } from "./series"

export const portfoliosMockData: Portfolio[] = [
  {
    id: "robotics-20",
    name: "Robotics, capped at 20%",
    brief:
      "Grow 500 USDC with robotics over 3+ years. Max 20% in any one stock, only stocks with $100K+ liquidity on Base. I'd panic at −20%. Ask before buying.",
    status: "live",
    holdings: [
      { symbol: "NVDAc", units: 0.5161, value: 78.08, cost: 75 },
      { symbol: "AMZNc", units: 0.2915, value: 77.63, cost: 75 },
      { symbol: "GOOGLc", units: 0.2737, value: 77.1, cost: 75 },
      { symbol: "TSLAc", units: 0.2021, value: 71.4, cost: 75 },
    ],
    cash: 200,
    startedAt: "2026-11-18T15:31:00",
    weekChange: 0.008,
    worstDip: -0.003,
    rules: { passing: 4, total: 4, checkedAt: "2026-11-20T09:00:00" },
    series: makeSeries(7, 0.12),
    benchmarkSeries: makeSeries(9, 0.05),
  },
  {
    id: "ai-chips-25",
    name: "AI chips, max 25%",
    brief: "Put 500 USDC into AI chips for 5 years. No more than 25% in one company.",
    status: "draft",
    holdings: [],
    cash: 0,
    note: "Brief written. Waiting for you to confirm the rules before research starts.",
    series: [],
  },
  {
    id: "robotics-8",
    name: "8 robotics at 15%+",
    brief: "Build me 8 robotics stocks, each at least 15% of the portfolio.",
    status: "unbuildable",
    holdings: [],
    cash: 0,
    rules: { passing: 3, total: 4, checkedAt: "2026-11-20T09:00:00" },
    constraint: { positions: 8, minimum: 0.15 },
    series: [],
  },
]
