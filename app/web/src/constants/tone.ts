export type Tone = "positive" | "negative" | "warning" | "info" | "neutral"

export const TONE_TEXT_CLASSNAME: Record<Tone, string> = {
  positive: "text-emerald-700 dark:text-emerald-400",
  negative: "text-red-700 dark:text-red-400",
  warning: "text-amber-700 dark:text-amber-400",
  info: "text-link",
  neutral: "text-ink-400",
}

export const TONE_DOT_CLASSNAME: Record<Tone, string> = {
  positive: "bg-emerald-600",
  negative: "bg-red-600",
  warning: "bg-amber-500",
  info: "bg-link",
  neutral: "bg-ink-300",
}

export const TONE_TILE_CLASSNAME: Record<Tone, string> = {
  positive: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  negative: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  info: "bg-link/10 text-link",
  neutral: "bg-inputBg text-ink-400 dark:bg-white/5",
}
