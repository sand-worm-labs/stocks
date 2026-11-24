import type { IconType } from "react-icons"
import {
  PiCoins,
  PiFunnel,
  PiGitFork,
  PiListChecks,
  PiPlayFill,
  PiScales,
  PiStackSimple,
  PiTrendUp,
} from "react-icons/pi"

import type { BlockInfo } from "@/lib/strategy/catalog"
import type { BlockKind } from "@/lib/strategy/flow/graph"

// How each kind of block looks, on the canvas and in the palette: its tile, its colour and the word on it
export const BLOCK_STYLE: Record<
  BlockKind,
  { label: string; icon: IconType; tint: string; accent: string; map: string }
> = {
  start: {
    label: "Start",
    icon: PiPlayFill,
    tint: "border-ink-100/20 bg-ink-100/10 text-ink-100",
    accent: "bg-ink-100",
    map: "#64748b",
  },
  if: {
    label: "If / else",
    icon: PiGitFork,
    tint: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    accent: "bg-amber-500",
    map: "#f59e0b",
  },
  group: {
    label: "Group",
    icon: PiStackSimple,
    tint: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    accent: "bg-sky-500",
    map: "#0ea5e9",
  },
  filter: {
    label: "Filter",
    icon: PiFunnel,
    tint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500",
    map: "#10b981",
  },
  asset: {
    label: "Stock",
    icon: PiTrendUp,
    tint: "border-border-secondary bg-hover-bg text-ink-100 dark:border-border-tertiary",
    accent: "bg-ink-400",
    map: "#94a3b8",
  },
  cash: {
    label: "Cash",
    icon: PiCoins,
    tint: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500",
    map: "#3b82f6",
  },
}

const PLAIN = "border-border-secondary bg-white text-ink-100 dark:border-border-tertiary dark:bg-white/5"

// The tile each thing in the add menu wears, after Composer's: plain for what holds, a colour for what decides or divides
export const MENU_STYLE: Record<BlockInfo["id"], { icon: IconType; tile: string }> = {
  asset: { icon: BLOCK_STYLE.asset.icon, tile: PLAIN },
  group: { icon: BLOCK_STYLE.group.icon, tile: PLAIN },
  weight: { icon: PiScales, tile: "border-transparent bg-green-700 text-white" },
  if: { icon: BLOCK_STYLE.if.icon, tile: "border-transparent bg-blue-600 text-white" },
  "any-all": { icon: PiListChecks, tile: "border-transparent bg-blue-600 text-white" },
  filter: { icon: BLOCK_STYLE.filter.icon, tile: "border-transparent bg-pink-400 text-white" },
  cash: { icon: BLOCK_STYLE.cash.icon, tile: PLAIN },
}
