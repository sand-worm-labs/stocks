import type { RouteId } from "@/config/routes"

export const FLOW_STEPS = [
  { id: "brief", label: "Idea", hint: "Say what you want to test", route: "brief" },
  { id: "rules", label: "Rules", hint: "Set the limits it can't break", route: "rules" },
  { id: "research", label: "Research", hint: "The agent designs and backtests it", route: "research" },
  { id: "report", label: "Results", hint: "See how it did, refine, decide", route: "report" },
  { id: "buy", label: "Trade", hint: "Review and sign on Base", route: "buy" },
] as const satisfies { id: string; label: string; hint: string; route: RouteId }[]

export type FlowStepId = (typeof FLOW_STEPS)[number]["id"]

// What the agent does while it researches, each step in its own Sandworm notebook
export const RESEARCH_STEPS = [
  "Read the idea",
  "Research",
  "Design",
  "Backtest",
  "Bias check",
  "Score",
  "Honesty check",
  "Results",
] as const

export const SANDWORM_APP_URL = "https://app.sandwormlab.xyz/"

// What the message box suggests while it is empty
export const AGENT_PROMPTS = [
  "Cap each stock at 15%",
  "Swap Tesla for Apple",
  "Add a fifth stock",
  "Keep half of it in cash",
  "What would a worst drop of −10% look like?",
] as const

export const BRIEF_PROMPTS = [
  "Grow 500 USDC with robotics over 3+ years, max 20% in any one stock",
  "AI for 5 years, no oil, ask before buying",
  "Protect my capital: mostly cash, a few small bets",
  "Big tech, equal weight, I'd panic at −20%",
] as const
