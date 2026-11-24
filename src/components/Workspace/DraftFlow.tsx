"use client"

import { createContext, useContext } from "react"

// What the agent's buttons beside a draft can do to the draft's own page, so "Confirm & research" and "Skip to the results" take the very
// step the page's own button takes, and are not just links to pages that would turn them back
export type DraftFlow = {
  confirm: () => void
  skip: () => void
  // A step is under way, so another can't be started
  busy: boolean
}

const DraftFlowContext = createContext<DraftFlow | undefined>(undefined)

export const DraftFlowProvider = DraftFlowContext.Provider

// The draft the agent panel sits beside, if it sits beside one: elsewhere there is none and its buttons are the links they always were
export const useDraftFlow = () => useContext(DraftFlowContext)
