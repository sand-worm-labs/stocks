import { kpisFor, prioritiesOf, reportInstructions } from "@/features/research/report-spec"
import type { StrategyRecord } from "@/features/strategies/types/strategy-record"

// What an agent from outside is shown of a strategy it is to research: what was asked for and the rules it was turned into.
export function brief({ id, name, brief, budget, assumption, summary, rules, strategy, stage }: StrategyRecord) {
  const priorities = prioritiesOf(brief, rules)
  const kpis = kpisFor(priorities)
  return {
    id,
    name,
    stage,
    brief,
    budget,
    assumption,
    summary,
    rules,
    strategy,
    // How the report should come out for this person, which is what to build the notebooks to
    report: { priorities, kpis, instructions: reportInstructions(priorities, kpis) },
  }
}

// One line per strategy, for choosing which to look at
export const listed = ({ id, name, brief, status, stage, createdAt }: StrategyRecord) => ({ id, name, brief, status, stage, createdAt })

// All of a strategy as its owner sees it: where it is, what research found, what it holds. A wallet start shows how much it may trade and from
// which wallet, but never the signed approval it rests on.
export function report({ id, name, brief, status, stage, holdings, cash, funding, research, events, startedAt }: StrategyRecord) {
  return {
    id,
    name,
    brief,
    status,
    stage,
    startedAt,
    holdings,
    cash,
    funding: funding && { mode: funding.mode, amount: funding.amount, from: funding.from },
    research: research && { mode: research.mode, error: research.error, progress: research.progress, result: research.result },
    events,
  }
}

// Whether research is going on, or has just come in: what the app watches while the person is elsewhere
export const isInResearch = ({ status, stage }: { status: string; stage?: string }) =>
  status === "draft" && (stage === "researching" || stage === "ready")
