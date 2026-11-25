import type { Activity } from "@/types/activity"
import type { StrategyRecord } from "@/types/store"

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
