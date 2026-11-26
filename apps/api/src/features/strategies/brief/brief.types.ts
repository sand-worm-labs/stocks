import type { BRIEF_GOALS, BRIEF_HORIZONS } from "./brief.constants"

export type Goal = (typeof BRIEF_GOALS)[number]
export type Horizon = (typeof BRIEF_HORIZONS)[number]

// Where in the brief's text something was read, so that changing it can change those words and no others
export type Span = { start: number; end: number }

export type Found<T> = { value: T; span: Span }

export type NamedList = {
  items: string[]
  hits: { item: string; span: Span }[]
  clause?: { list: Span; whole: Span; items: string[] }
}

export type BriefFields = {
  goal?: Found<Goal>
  horizon?: Found<Horizon>
  // The fall that would make the person sell, in percent: 20 is −20%
  loss?: Found<number>
  budget?: Found<number>
  maxPerStock?: Found<number>
  minLiquidity?: number
  askBeforeBuying: boolean
  include: NamedList
  avoid: NamedList
}

type BriefStatus = "empty" | "unreadable" | "unrealistic" | "needs-answers" | "ready"

export type BriefIssue = {
  kind: "unrealistic" | "conflict"
  message: string
  fixes: string[]
}

export type MissingField = "goal" | "horizon" | "loss" | "budget"

export type BriefAnalysis = {
  status: BriefStatus
  fields: BriefFields
  issues: BriefIssue[]
  missing: MissingField[]
}
