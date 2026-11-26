"use client"

import { createContext, useContext } from "react"

type DraftFlow = {
  confirm: () => void
  skip: () => void
  busy: boolean
}

const DraftFlowContext = createContext<DraftFlow | undefined>(undefined)

export const DraftFlowProvider = DraftFlowContext.Provider

export const useDraftFlow = () => useContext(DraftFlowContext)
