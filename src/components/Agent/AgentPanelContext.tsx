"use client"

import { createContext, useContext } from "react"

type AgentPanelValue = { close?: () => void }

export const AgentPanelContext = createContext<AgentPanelValue>({})

// What the panel the agent sits in lets it do: close itself, when it is a panel that can be closed
export const useAgentPanel = () => useContext(AgentPanelContext)
