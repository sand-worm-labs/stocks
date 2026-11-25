import { PiArrowDownRight, PiArrowUpRight } from "react-icons/pi"

// How many of the latest trades the tape shows, and how tall a row is. The list is always exactly this tall, whether it holds ten trades or
// none, so a trade landing never moves anything else on the page.
export const SHOWN = 10

export const ROW = 45

export const COLUMNS =
  "grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-3 px-4 sm:grid-cols-[5.5rem_1fr_1fr_3rem] md:px-5"

export const SIDE = {
  buy: {
    label: "Bought",
    verb: "Buy",
    Icon: PiArrowUpRight,
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  sell: { label: "Sold", verb: "Sell", Icon: PiArrowDownRight, text: "text-error", dot: "bg-error" },
} as const
