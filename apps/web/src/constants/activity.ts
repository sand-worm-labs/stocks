import type { IconType } from "react-icons"
import {
  PiArrowLineDown,
  PiArrowLineUp,
  PiArrowsLeftRight,
  PiBell,
  PiFileText,
  PiHandCoins,
  PiLockKey,
  PiLockSimple,
  PiMagnifyingGlass,
  PiPencilSimpleLine,
  PiPlayCircle,
  PiProhibit,
  PiPulse,
  PiShieldCheck,
  PiSlidersHorizontal,
} from "react-icons/pi"

export const ACTIVITY_FILTERS = ["all", "trades", "agent", "alerts", "refusals"] as const

export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]

// Refusals aren't shown until the agent can refuse something: a filter that is always empty reads as broken
export const SHOWN_ACTIVITY_FILTERS = ACTIVITY_FILTERS.filter((filter) => filter !== "refusals")

export const DEFAULT_ACTIVITY_FILTER: ActivityFilter = "all"

export const ACTIVITY_FILTER_LABEL = {
  all: "All",
  trades: "Trades",
  agent: "Agent",
  alerts: "Alerts",
  refusals: "Refusals",
} as const satisfies Record<ActivityFilter, string>

export const ACTIVITY_EMPTY = {
  all: { icon: PiPulse, title: "No activity yet", hint: "Trades, checks and alerts will show up here." },
  trades: {
    icon: PiHandCoins,
    title: "No trades yet",
    hint: "When the agent buys or sells, the receipts will show up here.",
  },
  agent: {
    icon: PiShieldCheck,
    title: "No agent checks yet",
    hint: "The agent's checks against your rules will show up here.",
  },
  alerts: { icon: PiBell, title: "No alerts", hint: "Price alerts and notices from your agent will show up here." },
  refusals: {
    icon: PiProhibit,
    title: "Nothing refused",
    hint: "Anything the agent turns down to keep to your rules will show up here.",
  },
} as const satisfies Record<ActivityFilter, { icon: IconType; title: string; hint: string }>

type KindDefinition = { icon: IconType; category: Exclude<ActivityFilter, "all"> }

export const ACTIVITY_KIND = {
  drafted: { icon: PiPencilSimpleLine, category: "agent" },
  researching: { icon: PiMagnifyingGlass, category: "agent" },
  ready: { icon: PiFileText, category: "alerts" },
  started: { icon: PiPlayCircle, category: "trades" },
  closed: { icon: PiLockSimple, category: "trades" },
  checked: { icon: PiShieldCheck, category: "agent" },
  locked: { icon: PiLockKey, category: "agent" },
  report: { icon: PiFileText, category: "agent" },
  adapted: { icon: PiSlidersHorizontal, category: "agent" },
  bought: { icon: PiHandCoins, category: "trades" },
  sold: { icon: PiHandCoins, category: "trades" },
  deposit: { icon: PiArrowLineDown, category: "trades" },
  withdrew: { icon: PiArrowLineUp, category: "trades" },
  refused: { icon: PiProhibit, category: "refusals" },
  alert: { icon: PiBell, category: "alerts" },
  gap: { icon: PiArrowsLeftRight, category: "alerts" },
} as const satisfies Record<string, KindDefinition>

export type ActivityKind = keyof typeof ACTIVITY_KIND

const BASE_SEPOLIA_EXPLORER_URL = "https://sepolia.basescan.org/"
export const explorerTxUrl = (hash: string) => `${BASE_SEPOLIA_EXPLORER_URL}tx/${hash}`
