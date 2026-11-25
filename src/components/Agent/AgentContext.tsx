"use client"

import { createContext, useContext } from "react"

type AgentContextValue = { send: (message: string) => void }

export const AgentContext = createContext<AgentContextValue>({ send: () => {} })

export const useAgent = () => useContext(AgentContext)
