import { REPORT_SECTIONS, sectionTitle } from "@/features/research/report-outline"
import { kpisFor, prioritiesOf, reportInstructions } from "@/features/research/report-spec"
import { TRASH_DAYS } from "./strategy-lifecycle"
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
    report: {
      priorities,
      kpis,
      // The parts of the report in order, which the notebook is laid out as: each is a heading cell in it, titled as given
      outline: REPORT_SECTIONS.map(({ id, reads }) => ({ id, title: sectionTitle(id), reads })),
      instructions: reportInstructions(priorities, kpis),
    },
  }
}

// One line per strategy, for choosing which to look at
export const listed = ({ id, name, brief, status, stage, createdAt, closedAt }: StrategyRecord) => ({ id, name, brief, status, stage, createdAt, closedAt })

// One line per strategy in the trash, with the day it will be deleted for good if nothing is done
export const trashed = ({ id, name, brief, status, deletedAt }: StrategyRecord) => ({
  id,
  name,
  brief,
  status,
  deletedAt,
  purgesAt: deletedAt ? new Date(Date.parse(deletedAt) + TRASH_DAYS * 24 * 60 * 60 * 1000).toISOString() : undefined,
})

// All of a strategy as its owner sees it: where it is, what research found, what it holds. A wallet start shows how much it may trade and from
// which wallet, but never the signed approval it rests on.
export function report({ id, name, brief, status, stage, holdings, cash, funding, research, events, startedAt, closedAt }: StrategyRecord) {
  return {
    id,
    name,
    brief,
    status,
    stage,
    startedAt,
    closedAt,
    holdings,
    cash,
    funding: funding && { mode: funding.mode, amount: funding.amount, from: funding.from },
    research: research && { mode: research.mode, runner: research.runner, error: research.error, progress: research.progress, result: research.result },
    events,
  }
}

// Whether research is going on, or has just come in: what the app watches while the person is elsewhere
export const isInResearch = ({ status, stage }: { status: string; stage?: string }) =>
  status === "draft" && (stage === "researching" || stage === "ready")
