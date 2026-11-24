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

// How far a draft has got, and what it is waiting for
export const DRAFT_STAGE = {
  rules: { label: "Rules to confirm", detail: "Read the rules, then confirm them" },
  researching: { label: "Researching", detail: "The agent is working on it" },
  ready: { label: "Results ready", detail: "Research is done. Review the results, then trade." },
} as const

export type DraftStage = keyof typeof DRAFT_STAGE

export const TRADING_MODE_LABEL = { paper: "Paper", live: "Live" } as const

export const TRADING_MODE_OPTIONS = [
  { value: "paper", title: "Paper trading", detail: "live prices" },
  { value: "live", title: "My wallet", detail: "real USDC" },
] as const satisfies { value: keyof typeof TRADING_MODE_LABEL; title: string; detail: string }[]
