import type { Strategy } from "@/lib/strategy/types"

const LEADERS = ["NVDAc", "AMZNc", "GOOGLc", "METAc", "TSLAc", "AAPLc"]

// A strategy of the kind the builder makes: ride the strongest stocks while the market is climbing, buy a dip, and otherwise
// hold the steadier ones. It stands in until each portfolio has a strategy of its own.
export const sampleStrategyMockData: Strategy = {
  name: "Trend and momentum",
  schedule: "weekly",
  root: {
    type: "if",
    condition: {
      left: { symbol: "AAPLc", indicator: { kind: "price" } },
      op: ">",
      right: { symbol: "AAPLc", indicator: { kind: "sma", days: 50 } },
    },
    then: {
      type: "group",
      name: "Ride the leaders",
      weighting: "specified",
      children: [
        {
          node: { type: "filter", pick: "top", count: 3, by: { kind: "return", days: 30 }, from: LEADERS },
          weight: 70,
        },
        { node: { type: "asset", symbol: "AAPLc" }, weight: 30 },
      ],
    },
    else: {
      type: "if",
      condition: {
        left: { symbol: "GOOGLc", indicator: { kind: "rsi", days: 14 } },
        op: "<",
        right: { value: 30 },
      },
      then: { type: "asset", symbol: "GOOGLc" },
      else: {
        type: "group",
        name: "Play it safe",
        weighting: "inverse-volatility",
        days: 20,
        children: [
          { node: { type: "asset", symbol: "AAPLc" } },
          { node: { type: "asset", symbol: "GOOGLc" } },
          { node: { type: "asset", symbol: "METAc" } },
        ],
      },
    },
  },
}
