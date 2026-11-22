export type Option = { value: string; label: string }

export const RISK_GOAL_OPTIONS: Option[] = [
  { value: "growth", label: "Growth" },
  { value: "balanced", label: "Balanced" },
  { value: "preserve", label: "Protect my money" },
]

export const HORIZON_OPTIONS: Option[] = [
  { value: "under-1y", label: "Under a year" },
  { value: "1-3y", label: "1 to 3 years" },
  { value: "3y+", label: "3+ years" },
]

// Choices for the numbers a setting takes, shown with the formatter that matches them
export const MAX_DRAWDOWN_CHOICES = [-0.1, -0.2, -0.3]
export const MAX_PER_STOCK_CHOICES = [0.1, 0.2, 0.25, 0.3]
export const MIN_LIQUIDITY_CHOICES = [50_000, 100_000, 250_000]

export const FAUCET_URL = "https://faucet.circle.com/"
