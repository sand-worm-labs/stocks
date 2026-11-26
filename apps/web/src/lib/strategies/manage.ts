// What the person is told before they close or delete a strategy, in words, from what the strategy holds. The API does the closing and the
// deleting and decides what is allowed; this only says what is about to happen.

export const TRASH_DAYS = 30

export const daysLeftInTrash = (purgesAt: string, now = Date.now()) => Math.max(0, Math.ceil((Date.parse(purgesAt) - now) / (24 * 60 * 60 * 1000)))

export function closeSummary({ stocks, value, cash }: { stocks: number; value: number; cash: number }) {
  const held = `${stocks} stock${stocks === 1 ? "" : "s"}`
  const amount = (value + cash).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return stocks > 0 ? `It holds ${held} and cash, about ${amount} USDC in all.` : `It holds no stocks, only cash: ${amount} USDC.`
}

// What goes to the trash with a strategy, by what kind it is
export function deleteConsequences(status: string) {
  const common = ["Its chat with the agent and its activity go with it.", "Anyone you shared its report with will no longer be able to open it."]
  const notebook = "The research notebook stays in your Sandworm workspace: it is yours, so delete it there if you want it gone."
  if (status === "closed") return ["Its record of what was bought and sold goes with it, and comes back if you put it back.", ...common, notebook]
  if (status === "draft") return ["Nothing has been traded, so no money is involved.", ...common, notebook]
  return [...common, notebook]
}
