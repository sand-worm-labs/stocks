import type { RouteId } from "@/config/routes"
import type { Tone } from "@/constants/tone"
import type { Rule, StrategyRow } from "@/lib/rules/types"

export type AgentAction = {
  label: string
  route: RouteId
  slug?: string
  intent: "dark" | "outline" | "link"
  icon?: "edit"
}

export type AgentStep = { label: string; state: "done" | "running" | "waiting"; note?: string }

// What an agent message is made of. A new kind of thing the agent can show is a new member here, a component in
// components/Agent/blocks and an entry in its registry.
export type AgentBlock =
  | { type: "text"; text: string }
  | { type: "steps"; title?: string; steps: AgentStep[] }
  | { type: "facts"; title: string; rows: StrategyRow[] }
  | { type: "rules"; title: string; note?: string; rules: Rule[] }
  // A note with a tone is set apart from the conversation, like a refusal
  | { type: "note"; label: string; text: string; tone?: Tone }
  | { type: "chips"; label?: string; chips: string[] }
  | { type: "actions"; actions: AgentAction[] }

export type AgentMessage = { id: string; from: "user" | "agent"; blocks: AgentBlock[] }

export type AgentStatus = { label: string; tone: Tone }

// The conversation a flow screen opens with
export type AgentScript = {
  status: AgentStatus
  // Where everything the agent has done for the portfolio can be read
  activityHref?: string
  messages: AgentMessage[]
}
