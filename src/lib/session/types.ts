import type { TRADING_MODE_LABEL } from "@/constants/portfolio"

export type Session = {
  user: { firstName: string }
  network: { mode: keyof typeof TRADING_MODE_LABEL; chain: string }
  // Who is signed in, by their Dynamic id. None when nobody is, as on the markets, which can be read without one.
  userId?: string
  // Whether they have been through the first-run stepper, and whether the welcome window is still to be shown
  onboarded: boolean
  welcomePending: boolean
  // The themes they said they are interested in, by id
  interests: string[]
  // Where the owner lives, by ISO country code, which decides whether tokenized stocks are offered to them
  region: string
  // The moment the page is rendered for. Mock data pins it so dates read the same on every load.
  now: string
}
