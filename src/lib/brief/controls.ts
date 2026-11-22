import { BRIEF_BUDGETS, BRIEF_GOALS, BRIEF_HORIZONS, CUSTOM_BUDGET } from "@/constants/brief"

import type { BriefField } from "./types"

export type BriefSettings = {
  goal?: string
  horizon?: string
  // A fall, in percent: 20 is −20%
  loss?: number
  budget?: string
  include: string[]
  avoid: string[]
}

const valueOf = (fields: BriefField[], label: string) => fields.find((field) => field.label === label)?.value

const numberIn = (value?: string) => {
  const found = Number(value?.replace(/[^\d.]/g, ""))
  return Number.isFinite(found) && found > 0 ? found : undefined
}

const listOf = (value?: string) => (value ? value.split(",").map((item) => item.trim()) : [])

// What the agent read from the brief, as the choices the controls start on. Anything it didn't read stays unset.
export function settingsFrom(fields: BriefField[]): BriefSettings {
  const goal = valueOf(fields, "Goal")
  const horizon = valueOf(fields, "Horizon")
  const budget = numberIn(valueOf(fields, "Budget"))

  return {
    goal: BRIEF_GOALS.find((option) => option === goal),
    horizon: BRIEF_HORIZONS.find((option) => option === horizon),
    loss: numberIn(valueOf(fields, "Loss you can live with")),
    budget:
      budget === undefined
        ? undefined
        : (BRIEF_BUDGETS.find((option) => option === budget)?.toString() ?? CUSTOM_BUDGET),
    include: listOf(valueOf(fields, "Include")),
    avoid: listOf(valueOf(fields, "Avoid")),
  }
}
