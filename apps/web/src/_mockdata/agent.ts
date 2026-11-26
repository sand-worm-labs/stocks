export const agentMockData = {
  rules: {
    status: "Waiting for you",
    intro:
      "Here's your idea as a strategy and rules. The rules lock when you confirm; your −20% becomes a test the backtest has to pass.",
  },
  research: {
    status: "Researching",
    intro: "Rules locked. Eight steps, each in its own notebook. The results fill in as they finish.",
  },
  report: {
    status: "Results ready",
    intro: "The verdict is in. Read it, refine it, or review and trade.",
  },
  adapt: {
    status: "Refining",
    intro: "Rerunning only what changes: Design, Backtest, Bias check, Score and Honesty check. Research is reused.",
    changes: ["Less risk", "Rebalance monthly", "Swap Tesla for Apple", "Add a 5th stock"],
  },
  cantMeet: {
    status: "Can't build this",
    intro: "I can't build this, for two separate reasons. I won't make up a strategy that only looks like it fits.",
    waysOut: ["4 stocks at 15%+, rest in cash", "4 stocks at 25% each", "Widen to AI and robotics"],
  },
} as const
