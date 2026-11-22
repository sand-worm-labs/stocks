import type { Starter } from "@/lib/onboarding/types"

import { makeGrowth } from "./series"

// A year in 60 steps, ending on a given return
const year = (seed: number, volatility: number, annualReturn: number) =>
  makeGrowth(seed, volatility, 1 + annualReturn, 1, 60, 0)

// Briefs worth starting from, each for a theme of the market, with how its backtest did over the last year
export const startersMockData: Starter[] = [
  {
    id: "robotics-20",
    title: "Robotics, capped at 20%",
    themes: ["robotics"],
    symbols: ["NVDAc", "AMZNc", "GOOGLc", "TSLAc"],
    oneYearReturn: 0.23,
    series: year(11, 0.012, 0.23),
    brief:
      "Grow 500 USDC with robotics over 3+ years. Max 20% in any one stock, only stocks with $100K+ liquidity on Base. I'd panic at −20%. Ask before buying.",
  },
  {
    id: "ai-chips-25",
    title: "AI chips, max 25%",
    themes: ["ai"],
    symbols: ["NVDAc", "ANTc", "GOOGLc"],
    oneYearReturn: 0.314,
    series: year(23, 0.014, 0.314),
    brief: "Put 500 USDC into AI chips for 5 years. No more than 25% in one company. Ask before buying.",
  },
  {
    id: "big-tech-35",
    title: "Big tech, balanced",
    themes: ["big-tech"],
    symbols: ["AMZNc", "GOOGLc", "AAPLc"],
    oneYearReturn: 0.182,
    series: year(37, 0.01, 0.182),
    brief: "Grow 500 USDC in big tech over 3+ years. Max 35% in any one stock. I'd panic at −20%. Ask before buying.",
  },
  {
    id: "hardware-50",
    title: "Hardware and memory",
    themes: ["hardware"],
    symbols: ["SNDKc", "AAPLc"],
    oneYearReturn: 0.149,
    series: year(41, 0.013, 0.149),
    brief: "Put 300 USDC into hardware and memory for 3 years. Max 50% in one stock. Ask before buying.",
  },
]
