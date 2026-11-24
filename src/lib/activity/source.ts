import { activityMockData } from "@/_mockdata/activity"
import type { StrategyRecord } from "@/lib/store/types"
import { getOwnStrategies } from "@/lib/strategies/source"

import type { Activity } from "./types"

// What happened to a strategy made here, as activity: it was drafted, researched, finished (which is also an alert, so it reaches the
// bell), and started. Each is told in the words the person will want when they come back to it.
export function activityOf({ id, name, brief, events }: StrategyRecord): Activity[] {
  const base = { portfolioId: id }
  return (events ?? []).map(({ kind, at }): Activity => {
    const key = `${id}:${kind}:${at}`
    switch (kind) {
      case "created":
        return {
          ...base,
          id: key,
          kind: "drafted",
          at,
          title: "Strategy drafted",
          detail: `From your idea: “${brief.length > 90 ? `${brief.slice(0, 87)}…` : brief}”`,
        }
      case "researching":
        return {
          ...base,
          id: key,
          kind: "researching",
          at,
          title: "Research started",
          detail: `Sandworm is researching ${name}. You don't need to wait: you'll be notified when the report is ready.`,
        }
      case "ready":
        return {
          ...base,
          id: key,
          kind: "ready",
          at,
          title: "Your report is ready",
          detail: `The research on ${name} has finished. Read the results, then decide whether to trade.`,
          action: { label: "View results", route: "portfolio", slug: id },
        }
      case "live":
        return { ...base, id: key, kind: "started", at, title: "Strategy started", detail: `${name} is trading.` }
    }
  })
}

// Newest first: what happened to the strategies this person made, with the made-up history that fills out the rest. Given a portfolio,
// only what happened to it.
export async function getActivity(portfolioId?: string): Promise<Activity[]> {
  const own = (await getOwnStrategies()).flatMap(activityOf)
  const all = [...own, ...activityMockData].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return portfolioId ? all.filter((event) => event.portfolioId === portfolioId) : all
}
