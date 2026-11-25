"use client"

import { createContext, useContext } from "react"

type AgentPanelValue = { close?: () => void }

export const AgentPanelContext = createContext<AgentPanelValue>({})

export const useAgentPanel = () => useContext(AgentPanelContext)
