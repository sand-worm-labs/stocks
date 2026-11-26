import type { RouteId } from "@/config/routes"
import type { Tone } from "@/constants/tone"
import type { Rule, StrategyRow } from "@/types/rules"

export type AgentAction = {
  label: string
  route: RouteId
  slug?: string
  intent: "dark" | "outline" | "link"
  icon?: "edit"
  flow?: "confirm" | "skip"
}

// What the agent can ask the person to confirm. Its status is the API's, and changes as the step is carried out.
export type ProposalStatus = "pending" | "working" | "done" | "cancelled" | "failed"

export type AgentStep = { label: string; state: "done" | "running" | "waiting"; note?: string; url?: string }

// What an agent message is made of. A new kind of thing the agent can show is a new member here, a component in
// components/Agent/blocks and an entry in its registry.
export type AgentBlock =
  | { type: "text"; text: string }
  | { type: "steps"; title?: string; steps: AgentStep[] }
  | { type: "facts"; title: string; rows: StrategyRow[] }
  | { type: "rules"; title: string; note?: string; rules: Rule[] }
  | { type: "note"; label: string; text: string; tone?: Tone }
  | { type: "chips"; label?: string; chips: string[] }
  | { type: "actions"; actions: AgentAction[] }
  // A step that moves money, which the agent has worked out and asks the person to confirm. `id` is the message it is in.
  | { type: "proposal"; id: string; title: string; rows: StrategyRow[]; status: ProposalStatus; confirmLabel: string }

// `at` is when it was said, once the API has kept it
export type AgentMessage = { id: string; from: "user" | "agent"; blocks: AgentBlock[]; at?: string }

// The conversation about a strategy as the API keeps it, with what the person can ask next
export type AgentThread = { messages: AgentMessage[]; suggestions: string[] }

type AgentStatus = { label: string; tone: Tone }

export type AgentScript = {
  status: AgentStatus
  activityHref?: string
  messages: AgentMessage[]
}
