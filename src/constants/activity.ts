import type { IconType } from "react-icons"
import {
  PiArrowsLeftRight,
  PiBell,
  PiFileText,
  PiHandCoins,
  PiLockKey,
  PiProhibit,
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

type KindDefinition = { icon: IconType; tone: Tone; category: Exclude<ActivityFilter, "all"> }

export const ACTIVITY_KIND = {
  checked: { icon: PiShieldCheck, tone: "positive", category: "agent" },
  locked: { icon: PiLockKey, tone: "positive", category: "agent" },
  report: { icon: PiFileText, tone: "neutral", category: "agent" },
  adapted: { icon: PiSlidersHorizontal, tone: "neutral", category: "agent" },
  bought: { icon: PiHandCoins, tone: "info", category: "trades" },
  refused: { icon: PiProhibit, tone: "negative", category: "refusals" },
  alert: { icon: PiBell, tone: "warning", category: "alerts" },
  gap: { icon: PiArrowsLeftRight, tone: "info", category: "alerts" },
} as const satisfies Record<string, KindDefinition>

export type ActivityKind = keyof typeof ACTIVITY_KIND

export const BASE_SEPOLIA_EXPLORER_URL = "https://sepolia.basescan.org/"
