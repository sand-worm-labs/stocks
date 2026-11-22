// What the agent says on each screen of the flow. Real replies come from the agent itself.
export const agentMockData = {
  rules: {
    status: "Waiting for you",
    intro:
      "Here's your brief as a strategy and rules. The rules lock when you confirm; your −20% becomes a test the backtest has to pass.",
  },
  research: {
    status: "Researching",
    intro: "Rules locked. Eight steps, each in its own notebook. The report fills in as they finish.",
  },
  report: {
    status: "Report ready",
    intro: "The verdict is in. Read it, adapt it, or review and buy.",
  },
  adapt: {
    status: "Adapting",
    intro: "Rerunning only what changes: Design, Backtest, Bias check, Score and Honesty check. Research is reused.",
    changes: ["Less risk", "Rebalance monthly", "Swap Tesla for Apple", "Add a 5th stock"],
  },
  cantMeet: {
    status: "Can't build this",
    intro: "I can't build this, for two separate reasons. I won't make up a portfolio that only looks like it fits.",
    waysOut: ["4 stocks at 15%+, rest in cash", "4 stocks at 25% each", "Widen to AI and robotics"],
  },
} as const
