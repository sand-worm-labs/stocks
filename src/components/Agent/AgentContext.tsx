"use client"

import { createContext, useContext } from "react"

type AgentContextValue = { send: (message: string) => void }

export const AgentContext = createContext<AgentContextValue>({ send: () => {} })

// What a block can ask of the conversation it sits in: say something on the person's behalf
export const useAgent = () => useContext(AgentContext)
