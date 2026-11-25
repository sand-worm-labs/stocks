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

export type AgentMessage = { id: string; from: "user" | "agent"; blocks: AgentBlock[] }

type AgentStatus = { label: string; tone: Tone }

export type AgentScript = {
  status: AgentStatus
  activityHref?: string
  messages: AgentMessage[]
}
