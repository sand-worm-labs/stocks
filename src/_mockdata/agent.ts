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
  live: {
    status: "Watching",
    intro: "Bought 4 stocks for 300.91 USDC on 18 Nov. I check your rules every day and ask before I buy.",
    refusal: {
      ask: "Put 40% in Tesla.",
      label: "Refused · rule 2 · max 20% per stock",
      reason: "I won't put 40% in Tesla. A chat message can't change a locked rule. You can change the rule itself.",
    },
    followUp: {
      ask: "OK. Add more NVIDIA with the cash then.",
      answer:
        "Also no: NVDAc is already close to its cap. The cash stays unless you raise the cap or add a fifth stock.",
    },
    quickAsks: ["Sell Tesla", "Set a stop-loss", "Add a fifth stock"],
  },
} as const
