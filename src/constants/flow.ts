import type { RouteId } from "@/config/routes"

export const FLOW_STEPS = [
  { id: "brief", label: "Brief", hint: "Say what you want", route: "brief" },
  { id: "rules", label: "Rules", hint: "Confirm and lock them", route: "rules" },
  { id: "research", label: "Research", hint: "The agent works", route: "research" },
  { id: "report", label: "Report", hint: "Read, adapt, decide", route: "report" },
  { id: "buy", label: "Buy", hint: "Review and sign", route: "buy" },
] as const satisfies { id: string; label: string; hint: string; route: RouteId }[]

export type FlowStepId = (typeof FLOW_STEPS)[number]["id"]

// What the agent does while it researches, each step in its own Sandworm notebook
export const RESEARCH_STEPS = [
  "Read the brief",
  "Research",
  "Design",
  "Backtest",
  "Bias check",
  "Score",
  "Honesty check",
  "Report",
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
