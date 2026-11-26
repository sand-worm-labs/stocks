import type { Settings } from "@/types/settings"

export const settingsMockData: Settings = {
  risk: { goal: "growth", maxDrawdown: -0.2, horizon: "3y+" },
  rules: { maxPerStock: 0.2, minLiquidity: 100_000, askBeforeBuying: true },
  notifications: { dailySummary: true, bigMoves: true },
  connectorUrl: "https://stocks.sandworm.com/api/mcp",
}
