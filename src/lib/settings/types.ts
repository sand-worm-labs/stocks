export type Settings = {
  testUsdc: number
  risk: { goal: string; maxDrawdown: number; horizon: string }
  rules: { maxPerStock: number; minLiquidity: number; askBeforeBuying: boolean }
  notifications: { dailySummary: boolean; bigMoves: boolean }
  connectorUrl: string
}
