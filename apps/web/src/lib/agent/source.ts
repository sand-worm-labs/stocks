import { agentMockData } from "@/_mockdata/agent"
import { routeHref } from "@/config/routes"
import { RESEARCH_STEPS } from "@/constants/flow"
import type { ResearchResult } from "@/lib/research/result"
import type { AgentMessage, AgentScript, AgentStep } from "@/types/agent"
import type { Portfolio } from "@/types/portfolios"
import type { Rule, StrategyRow } from "@/types/rules"
import type { ResearchRun } from "@/types/store"

const brief = ({ brief, id }: Portfolio): AgentMessage => ({
  id: `${id}-brief`,
  from: "user",
  blocks: [{ type: "text", text: brief }],
})

const researchSteps = (done: number, reused: readonly string[] = []): AgentStep[] =>
  RESEARCH_STEPS.map((label, i) => ({
    label,
    state: i < done ? "done" : i === done ? "running" : "waiting",
    note: reused.includes(label) ? "reused" : undefined,
  }))

type RulesInput = { rules: Rule[]; strategy: StrategyRow[]; assumption: string }

export async function getRulesScript(
  portfolio: Portfolio,
  { rules, strategy, assumption }: RulesInput
): Promise<AgentScript> {
  const { status, intro } = agentMockData.rules

  return {
    status: { label: status, tone: "warning" },
    messages: [
      brief(portfolio),
      {
        id: `${portfolio.id}-rules`,
        from: "agent",
        blocks: [
          { type: "text", text: intro },
          { type: "facts", title: "Strategy", rows: strategy },
          { type: "rules", title: "Your rules", note: "Locks on confirm", rules },
          { type: "note", label: "Assumptions", text: assumption },
          {
            type: "actions",
            actions: [
              { label: "Confirm & research", route: "research", slug: portfolio.id, intent: "link", flow: "confirm" },
              { label: "Edit", route: "rules", slug: portfolio.id, intent: "outline", icon: "edit" },
            ],
          },
        ],
      },
    ],
  }
}

export async function getResearchScript(portfolio: Portfolio, done: number): Promise<AgentScript> {
  const { status, intro } = agentMockData.research

  return {
    status: { label: status, tone: "info" },
    messages: [
      brief(portfolio),
      {
        id: `${portfolio.id}-research`,
        from: "agent",
        blocks: [
          { type: "text", text: intro },
          { type: "steps", title: "Research", steps: researchSteps(done) },
          {
            type: "actions",
            actions: [
              { label: "Skip to the results", route: "report", slug: portfolio.id, intent: "outline", flow: "skip" },
            ],
          },
        ],
      },
    ],
  }
}

export async function getReportScript(portfolio: Portfolio): Promise<AgentScript> {
  const { status, intro } = agentMockData.report

  return {
    status: { label: status, tone: "positive" },
    messages: [
      brief(portfolio),
      {
        id: `${portfolio.id}-report`,
        from: "agent",
        blocks: [
          { type: "text", text: intro },
          { type: "steps", title: "Research", steps: researchSteps(RESEARCH_STEPS.length) },
          {
            type: "actions",
            actions: [
              { label: "Review and trade", route: "buy", slug: portfolio.id, intent: "dark" },
              { label: "Refine", route: "adapt", slug: portfolio.id, intent: "outline" },
            ],
          },
        ],
      },
    ],
  }
}

// The sidebar while Sandworm does the research: what has been done, what is being done, and each notebook as soon as it exists. What it
// says is the run's own state, not a script.
export async function getLiveResearchScript(portfolio: Portfolio, run: ResearchRun): Promise<AgentScript> {
  const failed = Boolean(run.error)
  const steps = run.progress ?? researchStepsStarting()

  return {
    status: failed ? { label: "Research stopped", tone: "negative" } : { label: "Researching on Sandworm", tone: "info" },
    messages: [
      brief(portfolio),
      {
        id: `${portfolio.id}-research`,
        from: "agent",
        blocks: [
          {
            type: "text",
            text: "I'm testing this on three years of real prices. The work is done in one notebook in your Sandworm account, linked here when it is made, so you can open it and read every number.",
          },
          { type: "steps", title: "Research", steps },
          ...(run.error ? [{ type: "note" as const, label: "What went wrong", text: run.error, tone: "negative" as const }] : []),
        ],
      },
    ],
  }
}

const researchStepsStarting = (): AgentStep[] =>
  ["Read the idea", "Get prices", "Backtest", "Risk check", "Results"].map((label, i) => ({
    label,
    state: i === 0 ? "running" : "waiting",
  }))

const TONE_OF_VERDICT = { good: "positive", warn: "warning", bad: "negative" } as const

// The sidebar once the research is done: what it found, in its own words, with the notebook it was found in. The cautions come first.
export async function getResultScript(portfolio: Portfolio, result: ResearchResult): Promise<AgentScript> {
  const worries = result.checks.filter(({ tone }) => tone !== "good").slice(0, 2)
  const steps: AgentStep[] = result.steps.map(({ label, url }) => ({ label, state: "done", ...(url && { url }) }))

  return {
    status: { label: result.verdict?.label ?? "Research done", tone: TONE_OF_VERDICT[result.verdict?.tone ?? "good"] },
    messages: [
      brief(portfolio),
      {
        id: `${portfolio.id}-report`,
        from: "agent",
        blocks: [
          { type: "text", text: result.headline },
          { type: "steps", title: "Research", steps },
          ...worries.map(({ tone, text }) => ({
            type: "note" as const,
            label: "Worth knowing",
            text,
            tone: tone === "bad" ? ("negative" as const) : ("warning" as const),
          })),
          {
            type: "actions",
            actions: [
              { label: "Review and trade", route: "buy", slug: portfolio.id, intent: "dark" },
              { label: "Refine", route: "adapt", slug: portfolio.id, intent: "outline" },
            ],
          },
        ],
      },
    ],
  }
}

export async function getAdaptScript(portfolio: Portfolio): Promise<AgentScript> {
  const { status, intro, changes } = agentMockData.adapt

  return {
    status: { label: status, tone: "info" },
    messages: [
      brief(portfolio),
      {
        id: `${portfolio.id}-adapt`,
        from: "agent",
        blocks: [
          { type: "text", text: intro },
          { type: "steps", title: "Research", steps: researchSteps(RESEARCH_STEPS.length, ["Research"]) },
          { type: "chips", label: "Try a change", chips: [...changes] },
        ],
      },
    ],
  }
}

export async function getCantMeetScript(portfolio: Portfolio): Promise<AgentScript> {
  const { status, intro, waysOut } = agentMockData.cantMeet

  return {
    status: { label: status, tone: "negative" },
    messages: [
      brief(portfolio),
      {
        id: `${portfolio.id}-cant-meet`,
        from: "agent",
        blocks: [
          { type: "text", text: intro },
          { type: "chips", label: "Pick one and I'll redo the rules", chips: [...waysOut] },
        ],
      },
    ],
  }
}

// The sidebar of a strategy that is trading. What is said in it is the conversation the API keeps for the strategy, not a script.
export async function getLiveScript(portfolio: Portfolio): Promise<AgentScript> {
  return {
    status: { label: "Watching", tone: "positive" },
    activityHref: routeHref("portfolioActivity", undefined, portfolio.id) ?? undefined,
    messages: [],
  }
}
