import type { IconType } from "react-icons"
import {
  PiArrowLineDown,
  PiArrowsLeftRight,
  PiBell,
  PiFileText,
  PiHandCoins,
  PiLockKey,
  PiProhibit,
  PiPulse,
  PiShieldCheck,
  PiSlidersHorizontal,
} from "react-icons/pi"

import type { Tone } from "./tone"

export const ACTIVITY_FILTERS = ["all", "trades", "agent", "alerts", "refusals"] as const

export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]

export const DEFAULT_ACTIVITY_FILTER: ActivityFilter = "all"

export const ACTIVITY_FILTER_LABEL = {
  all: "All",
  trades: "Trades",
  agent: "Agent",
  alerts: "Alerts",
  refusals: "Refusals",
} as const satisfies Record<ActivityFilter, string>

// What the list says when a filter has nothing in it
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

type KindDefinition = { icon: IconType; tone: Tone; category: Exclude<ActivityFilter, "all"> }

export const ACTIVITY_KIND = {
  checked: { icon: PiShieldCheck, tone: "positive", category: "agent" },
  locked: { icon: PiLockKey, tone: "positive", category: "agent" },
  report: { icon: PiFileText, tone: "neutral", category: "agent" },
  adapted: { icon: PiSlidersHorizontal, tone: "neutral", category: "agent" },
  bought: { icon: PiHandCoins, tone: "info", category: "trades" },
  sold: { icon: PiHandCoins, tone: "neutral", category: "trades" },
  deposit: { icon: PiArrowLineDown, tone: "positive", category: "trades" },
  refused: { icon: PiProhibit, tone: "negative", category: "refusals" },
  alert: { icon: PiBell, tone: "warning", category: "alerts" },
  gap: { icon: PiArrowsLeftRight, tone: "info", category: "alerts" },
} as const satisfies Record<string, KindDefinition>

export type ActivityKind = keyof typeof ACTIVITY_KIND

export const BASE_SEPOLIA_EXPLORER_URL = "https://sepolia.basescan.org/"
export const explorerTxUrl = (hash: string) => `${BASE_SEPOLIA_EXPLORER_URL}tx/${hash}`
