"use client"

import { createContext, useContext } from "react"

type AgentContextValue = {
  send: (message: string) => void
  // Confirms or cancels a step the agent proposed, which is only there when the conversation is the one kept for a strategy
  decide?: (messageId: string, decision: "confirm" | "cancel") => void
}

export const AgentContext = createContext<AgentContextValue>({ send: () => {} })

export const useAgent = () => useContext(AgentContext)
