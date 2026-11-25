import type { Weighting } from "@/types/strategy"

export type BlockInfo = {
  id: "asset" | "group" | "weight" | "if" | "any-all" | "filter" | "rebalance" | "cash"
  label: string
  description: string
}

// In the order the add menu shows them. Weight and any / all are not blocks of their own in a strategy: a weight is a group
// with its weighting chosen, and any / all is an if with several conditions. They are offered as blocks because that is how
// they are reached for.
export const BLOCKS: BlockInfo[] = [
  { id: "asset", label: "Stock", description: "Hold one stock." },
  {
    id: "group",
    label: "Group",
    description: "Hold several things at once, split equally. Groups nest in groups.",
  },
  {
    id: "weight",
    label: "Weight",
    description: "Hold several things at once, split how you choose: equally, by shares, or the steadier the more.",
  },
  {
    id: "if",
    label: "If / else",
    description: "Look at the market and take one path or the other.",
  },
  {
    id: "any-all",
    label: "Any / all",
    description: "An if with several conditions: all of them must hold, or any one is enough.",
  },
  {
    id: "filter",
    label: "Filter",
    description: "From a set of stocks, keep only the best or worst few by an indicator.",
  },
  {
    id: "rebalance",
    label: "Rebalance",
    description: "Keep what is inside on target: trade back only when a stock has drifted too far from its share.",
  },
  { id: "cash", label: "Cash", description: "Hold USDC, no stock at all. Where to wait out a bad market." },
]

export const WEIGHTINGS: { id: Weighting; label: string; description: string }[] = [
  { id: "equal", label: "Equal", description: "The same share for each." },
  { id: "specified", label: "Specified", description: "A share you choose for each." },
  { id: "inverse-volatility", label: "Inverse volatility", description: "The steadier a stock, the more it gets." },
]
