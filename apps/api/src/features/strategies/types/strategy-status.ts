// What a strategy's status and stage can be, with the words the API uses in what it answers. The icons for them are the web app's, since they are only
// for display.
export type PortfolioStatus = "live" | "draft" | "unbuildable"

export const DRAFT_STAGE = {
  rules: { label: "Rules to confirm", detail: "Read the rules, then confirm them" },
  researching: { label: "Researching", detail: "The agent is working on it" },
  ready: { label: "Results ready", detail: "Research is done. Review the results, then trade." },
} as const

export type DraftStage = keyof typeof DRAFT_STAGE
