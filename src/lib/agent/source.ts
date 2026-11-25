import { agentMockData } from "@/_mockdata/agent"
import { routeHref } from "@/config/routes"
import { RESEARCH_STEPS } from "@/constants/flow"
import type { AgentMessage, AgentScript, AgentStep } from "@/types/agent"
import type { Portfolio } from "@/types/portfolios"
import type { Rule, StrategyRow } from "@/types/rules"

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
          { type: "note", label: "I assumed", text: assumption },
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

export async function getLiveScript(portfolio: Portfolio): Promise<AgentScript> {
  const { status, intro, refusal, followUp, quickAsks } = agentMockData.live
  const say = (id: string, from: "user" | "agent", ...blocks: AgentMessage["blocks"]): AgentMessage => ({
    id: `${portfolio.id}-${id}`,
    from,
    blocks,
  })

  return {
    status: { label: status, tone: "positive" },
    activityHref: routeHref("portfolioActivity", undefined, portfolio.id) ?? undefined,
    messages: [
      say("live", "agent", { type: "text", text: intro }),
      say("ask", "user", { type: "text", text: refusal.ask }),
      say(
        "refused",
        "agent",
        { type: "note", label: refusal.label, text: refusal.reason, tone: "negative" },
        { type: "actions", actions: [{ label: "Change rules", route: "adapt", slug: portfolio.id, intent: "outline" }] }
      ),
      say("follow-up", "user", { type: "text", text: followUp.ask }),
      say("answer", "agent", { type: "text", text: followUp.answer }, { type: "chips", chips: [...quickAsks] }),
    ],
  }
}
