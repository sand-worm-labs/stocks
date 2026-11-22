import type { IconType } from "react-icons"
import { PiChartLineUp, PiHourglass, PiProhibit } from "react-icons/pi"

import type { RouteId } from "@/config/routes"

import type { Tone } from "./tone"

type StatusDefinition = {
  label: string
  tone: Tone
  icon: IconType
  // The page a portfolio in this status opens
  route: RouteId
}

export const PORTFOLIO_STATUS = {
  live: { label: "Live", tone: "positive", icon: PiChartLineUp, route: "portfolio" },
  draft: { label: "Draft", tone: "warning", icon: PiHourglass, route: "rules" },
  unbuildable: {
    label: "Can't be built",
    tone: "negative",
    icon: PiProhibit,
    route: "portfolio",
  },
} as const satisfies Record<string, StatusDefinition>

export type PortfolioStatus = keyof typeof PORTFOLIO_STATUS

// What the agent is waiting on, for a portfolio that isn't live.
export const PORTFOLIO_PENDING_TEXT = {
  draft: "Waiting for you to confirm rules",
  unbuildable: "Can't be built",
} as const satisfies Partial<Record<PortfolioStatus, string>>

export const TRADING_MODE_LABEL = { paper: "Paper", live: "Live" } as const

export const TRADING_MODE_OPTIONS = [
  { value: "paper", label: "Paper trading · live prices" },
  { value: "live", label: "My wallet · real USDC" },
] as const satisfies { value: keyof typeof TRADING_MODE_LABEL; label: string }[]
