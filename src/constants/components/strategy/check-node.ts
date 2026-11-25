import { type CheckState } from "@/lib/rules/flow"

export const TONE: Record<CheckState, { tint: string; bar: string; word: string; card: string }> = {
  holds: {
    tint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-600",
    word: "Holds",
    card: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30",
  },
  watch: {
    tint: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    word: "Watch",
    card: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30",
  },
  broken: {
    tint: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    bar: "bg-red-600",
    word: "Broken",
    card: "border-red-500/40 bg-red-50 dark:bg-red-950/40",
  },
}

export const EXIT_TONE = {
  tint: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  bar: "bg-red-500",
  word: "Watching",
  card: "border-red-500/40 bg-red-50 dark:bg-red-950/40",
}
