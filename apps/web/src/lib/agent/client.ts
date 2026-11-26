import { call } from "@/lib/strategies/client"
import type { AgentMessage, AgentThread } from "@/types/agent"

// The conversation with the agent about one strategy, kept by the API for the signed-in person. The browser calls it as them, with the
// session cookie, on this origin.
const addressOf = (strategyId: string) => `/api/strategies/${encodeURIComponent(strategyId)}/agent`

export const loadThread = (strategyId: string) => call<AgentThread>(addressOf(strategyId), "GET")

// The person's message as it was kept, and the agent's answer to it. `superseded` are steps it had asked to confirm that this answer takes
// off the table.
export const sendMessage = (strategyId: string, text: string) =>
  call<{ messages: AgentMessage[]; superseded: string[] }>(`${addressOf(strategyId)}/messages`, "POST", { text })

// The step's own message as it stands now, and the agent's answer when there is one
export const decideStep = (strategyId: string, messageId: string, decision: "confirm" | "cancel") =>
  call<{ messages: AgentMessage[] }>(`${addressOf(strategyId)}/messages/${encodeURIComponent(messageId)}`, "POST", { decision })
