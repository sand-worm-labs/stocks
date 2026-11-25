import type { TRADING_MODE_LABEL } from "@/constants/portfolio"

export type Session = {
  user: { firstName: string }
  network: { mode: keyof typeof TRADING_MODE_LABEL; chain: string }
  userId?: string
  onboarded: boolean
  welcomePending: boolean
  interests: string[]
  region: string
  // The moment the page is rendered for. Mock data pins it so dates read the same on every load.
  now: string
}
