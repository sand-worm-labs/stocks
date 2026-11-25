import { MARKET_PATH } from "@/constants/realtime"

export const realtimeUrl = () =>
  process.env.REALTIME_WS_URL ?? (process.env.NODE_ENV === "production" ? undefined : "ws://localhost:3002")

export const marketUrl = () => {
  const base = realtimeUrl()
  return base ? new URL(MARKET_PATH, base).toString() : undefined
}
