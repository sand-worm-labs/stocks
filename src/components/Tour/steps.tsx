import type { ReactNode } from "react"

import { EXAMPLE } from "@/constants/components/tour/steps"
import { env } from "env.mjs"

export type TourStep = {
  id: string
  chapter: number
  route?: string
  target?: string
  title: string
  text: string
  visual?: ReactNode
  mark?: boolean
  more?: { label: string; href: string }
  action?: { label: string; href: string }
}

export const CHAPTERS = ["Get started", "Write the idea", "Design and test", "Decide and trade", "After you trade"]

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    chapter: 0,
    mark: true,
    title: "Welcome to Sandworm Stocks",
    // A blank line is a new paragraph
    text: "Sandworm Stocks is an automated investing platform that buys and sells stocks for you based on a plan you choose or create.\n\nTest different plans, pick one you like, invest your money, and let our AI handle the trades.",
    more: { label: "Learn more", href: env.NEXT_PUBLIC_LEARN_MORE_URL ?? `${env.NEXT_PUBLIC_LANDING_URL}/blog` },
  },
  {
    id: "start",
    chapter: 0,
    route: "/strategies",
    target: "new-strategy",
    title: "Every strategy starts here",
    text: "This is My strategies. Press New strategy to begin. When you press Next, we'll open it for you.",
  },
  {
    id: "idea",
    chapter: 1,
    route: "/strategies/new/brief",
    target: "idea-box",
    title: "Write the idea in plain words",
    text: "Say what to invest in, how much, for how long and any limits, like “Grow 500 USDC with robotics, max 20% in one stock”. As you type, your goal, horizon and budget fill in below for you to check.",
  },
  {
    id: "steps",
    chapter: 1,
    route: "/strategies/new/brief",
    target: "flow-steps",
    title: "Five steps to a live strategy",
    text: "You're on Idea. Next the agent drafts the rules for you to confirm, then researches and tests it on history. You decide from the results, then trade.",
  },
  {
    id: "rules",
    chapter: 2,
    route: `${EXAMPLE}/rules`,
    target: "rules-limits",
    title: "Rules it can't break",
    text: "This is Steady leaders, a strategy we made earlier. Limits are lines it can never cross, like the budget and the most in one stock. Above them, Rebalance keeps it on target and Exits say when it sells.",
  },
  {
    id: "research",
    chapter: 2,
    route: `${EXAMPLE}/research`,
    target: "research-progress",
    title: "The agent does the middle",
    text: "It reads your idea, designs the strategy, backtests it on real price history, checks it for bias and writes the verdict. You can leave while it works and come back.",
  },
  {
    id: "results",
    chapter: 3,
    route: `${EXAMPLE}/report`,
    target: "results-metrics",
    title: "See how it would have done",
    text: "Growth, the worst drop and the reward for the risk, set against the S&P 500. History is not a promise, so look at the worst drop first.",
  },
  {
    id: "trade",
    chapter: 3,
    route: `${EXAMPLE}/report`,
    target: "results-actions",
    title: "Refine it, or trade it",
    text: "Refine changes the idea or the rules and tests again. Review and trade lists the exact orders. You sign once, and then it runs by itself inside its rules.",
  },
  {
    id: "holdings",
    chapter: 4,
    route: "/holdings",
    target: "nav-holdings",
    title: "Everything you own, in one place",
    text: "After you trade, each strategy keeps its own page with its value, what it holds and every check it makes. Holdings adds up every stock across all of them.",
  },
  {
    id: "go",
    chapter: 4,
    route: "/strategies",
    mark: true,
    title: "You're ready",
    text: "Nothing is bought or sold until you've reviewed and signed it. Start with an idea, or look around first.",
    action: { label: "Start a strategy", href: "/strategies/new/brief" },
  },
]
