import type { BRIEF_GOALS, BRIEF_HORIZONS } from "@/constants/brief"

export type Goal = (typeof BRIEF_GOALS)[number]
export type Horizon = (typeof BRIEF_HORIZONS)[number]

// Where in the brief's text something was read, so that changing it can change those words and no others
export type Span = { start: number; end: number }

export type Found<T> = { value: T; span: Span }

// A list the brief names: the stocks or themes wanted, or the ones to keep out
export type NamedList = {
  items: string[]
  // Words in the text that name one of the items by themselves, such as the "robotics" of "with robotics"
  hits: { item: string; span: Span }[]
  // A clause that lists them, such as "Include robotics and AI"
  clause?: { list: Span; whole: Span; items: string[] }
}

// What the agent has read in a brief. A field it didn't find is missing.
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

export type BriefStatus = "empty" | "unreadable" | "unrealistic" | "needs-answers" | "ready"

export type BriefIssue = {
  kind: "unrealistic" | "conflict"
  message: string
  // Whole briefs the person can swap in, each one that can be done
  fixes: string[]
}

export type MissingField = "goal" | "horizon" | "loss" | "budget"

export type BriefAnalysis = {
  status: BriefStatus
  fields: BriefFields
  issues: BriefIssue[]
  missing: MissingField[]
}

// A change made in a control, to be written back into the brief
export type BriefChange =
  | { field: "goal"; value: Goal }
  | { field: "horizon"; value: Horizon }
  | { field: "loss"; value: number }
  | { field: "budget"; value: number }
  | { field: "include"; items: string[] }
  | { field: "avoid"; items: string[] }
