import type { Indicator, Weighting } from "./types"

// Everything a strategy can be built from, in one place: the palette on the canvas lists it, and the add menu will offer it.

export type BlockInfo = { id: "asset" | "cash" | "group" | "if" | "filter"; label: string; description: string }

export const BLOCKS: BlockInfo[] = [
  { id: "asset", label: "Stock", description: "Hold one stock." },
  { id: "cash", label: "Cash", description: "Hold USDC, no stock at all. Where to wait out a bad market." },
  {
    id: "group",
    label: "Group",
    description: "Hold several things at once, divided by a weighting. Groups nest in groups.",
  },
  {
    id: "if",
    label: "If / else",
    description: "Look at the market and take one path or the other. One or several conditions.",
  },
  {
    id: "filter",
    label: "Filter",
    description: "From a set of stocks, keep only the best or worst few by an indicator.",
  },
]

export const WEIGHTINGS: { id: Weighting; label: string; description: string }[] = [
  { id: "equal", label: "Equal", description: "The same share for each." },
  { id: "specified", label: "Specified", description: "A share you choose for each." },
  { id: "inverse-volatility", label: "Inverse volatility", description: "The steadier a stock, the more it gets." },
]

export type IndicatorInfo = { label: string; description: string; make: (days: number) => Indicator; days?: number }

export const INDICATORS: IndicatorInfo[] = [
  { label: "Current price", description: "What it costs now.", make: () => ({ kind: "price" }) },
  {
    label: "Moving average of price",
    description: "Its average price over the last days.",
    days: 50,
    make: (days) => ({ kind: "sma", days }),
  },
  {
    label: "Exponential moving average",
    description: "The same, leaning on the latest days.",
    days: 20,
    make: (days) => ({ kind: "ema", days }),
  },
  {
    label: "Cumulative return",
    description: "What it has gained or lost over the last days.",
    days: 30,
    make: (days) => ({ kind: "return", days }),
  },
  {
    label: "Moving average of return",
    description: "How much it moves a day, on average.",
    days: 10,
    make: (days) => ({ kind: "sma-return", days }),
  },
  {
    label: "RSI",
    description: "How overbought (high) or oversold (low) it is, from 0 to 100.",
    days: 14,
    make: (days) => ({ kind: "rsi", days }),
  },
  {
    label: "Standard deviation of return",
    description: "How much its daily moves swing.",
    days: 20,
    make: (days) => ({ kind: "volatility", days }),
  },
  {
    label: "Standard deviation of price",
    description: "How far its price strays from its average.",
    days: 20,
    make: (days) => ({ kind: "std-price", days }),
  },
  {
    label: "Max drawdown",
    description: "The worst fall from a high in the last days.",
    days: 60,
    make: (days) => ({ kind: "drawdown", days }),
  },
]
