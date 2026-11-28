// What Sandworm's agent does while it researches, as the person reads it in the strategy's own chat: its thinking, the cells it writes and runs
// in the notebook, and what it says. Kept as one message of the strategy's conversation, and added to as the run goes.
export type RunPart =
  | { type: "thinking"; text: string }
  // A cell the agent is writing (`making`), has created (`made`) or has run (`ran`)
  | { type: "action"; state: "making" | "made" | "ran"; title: string; blockType?: string }
  | { type: "text"; text: string }
  // What Stocks asked the agent when what it printed was not enough, so the person sees why it went on
  | { type: "asked"; text: string }
  | { type: "error"; message: string }

export type RunStatus = "running" | "done" | "failed"

export type ResearchChatLog = {
  // Which run this is: a strategy's research can be started again, and each run is its own message
  runStartedAt: string
  status: RunStatus
  notebookUrl?: string
  // Whose work it is: Sandworm's own agent, or an agent from outside (Claude, through the Stocks MCP) that tells what it does as it goes
  runner?: "sandworm" | "agent"
  parts: RunPart[]
}

// What is kept of a long run: enough to follow it, and never more than one message can carry
export const MOST_PARTS = 150
export const MOST_THINKING = 1200
export const MOST_TEXT = 6000
