// Each strategy card in its own soft colour, fading out at the bottom
export const CARD_TINTS = [
  "from-rose-100 via-rose-50 to-rose-50/40 dark:from-rose-950/50 dark:via-rose-950/20 dark:to-transparent",
  "from-emerald-100 via-emerald-50 to-emerald-50/40 dark:from-emerald-950/50 dark:via-emerald-950/20 dark:to-transparent",
  "from-indigo-100 via-indigo-50 to-indigo-50/40 dark:from-indigo-950/50 dark:via-indigo-950/20 dark:to-transparent",
  "from-amber-100 via-amber-50 to-amber-50/40 dark:from-amber-950/50 dark:via-amber-950/20 dark:to-transparent",
  "from-sky-100 via-sky-50 to-sky-50/40 dark:from-sky-950/50 dark:via-sky-950/20 dark:to-transparent",
  "from-violet-100 via-violet-50 to-violet-50/40 dark:from-zinc-700/40 dark:via-zinc-800/20 dark:to-transparent",
]

export const CARD_SURFACE =
  "animate-fade-up bg-gradient-to-b text-left border-border-secondary dark:border-border-tertiary flex w-full flex-col overflow-hidden rounded-[28px] border shadow-[0_10px_40px_-18px_rgba(24,39,75,0.25)] transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5"

// The same colours as the cards, as solid fills, so a portfolio is the same colour in the bar above it
export const ALLOCATION_FILLS = [
  "bg-gradient-to-r from-rose-400 to-rose-500",
  "bg-gradient-to-r from-emerald-400 to-emerald-500",
  "bg-gradient-to-r from-indigo-400 to-indigo-500",
  "bg-gradient-to-r from-amber-400 to-amber-500",
  "bg-gradient-to-r from-sky-400 to-sky-500",
  "bg-gradient-to-r from-violet-400 to-violet-500 dark:from-zinc-300 dark:to-white",
]
export const CASH_FILL = "bg-ink-300"
export const OTHER_FILL = "bg-ink-200"
