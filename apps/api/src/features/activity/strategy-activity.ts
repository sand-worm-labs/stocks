import { formatAmount } from "@/common/utils/format"
import { ledgerOf } from "@/features/strategies/trading/ledger"
import type { Activity } from "@/features/activity/types/activity.types"
import type { StrategyRecord } from "@/features/strategies/types/strategy-record"

// What happened to a strategy's money, from its ledger: money put in, stocks bought and sold, cash taken out. Each trade carries its receipt.
// The first deposit, and what it bought, are how the strategy started, and are shown as that.
function moneyActivity(record: StrategyRecord): Activity[] {
  if (record.status !== "live") return []
  const base = { portfolioId: record.id }

  return ledgerOf(record).flatMap((line, i): Activity[] => {
    const id = `${record.id}:ledger:${i}`
    const { kind, symbol, units = 0, price = 0, usdc, fee = 0, at } = line
    const started = i === 0
    if (kind === "deposit")
      return [{ ...base, id, kind: "deposit", at, title: started ? "Funded" : "Funds added", detail: `${formatAmount(usdc)} USDC ${started ? "to start with" : "put in"}.` }]
    if (kind === "withdraw")
      return [{ ...base, id, kind: "withdrew", at, title: "Funds taken out", detail: `${formatAmount(-usdc)} USDC taken out of the strategy's cash.` }]
    if (!symbol || (kind !== "buy" && kind !== "sell")) return []

    const buying = kind === "buy"
    const spend = buying ? -usdc - fee : usdc + fee
    return [
      {
        ...base,
        id,
        kind: buying ? "bought" : "sold",
        at,
        title: `${buying ? "Bought" : "Sold"} ${symbol}`,
        detail: `${Math.abs(units).toFixed(4)} at ${formatAmount(price)} USDC${buying ? "" : ", for " + formatAmount(spend) + " USDC"}. Paper trading: no money moved.`,
        trade: { symbol, side: kind, spend, units: Math.abs(units), price, fee, impact: 0, tx: "" },
      },
    ]
  })
}

export function activityOf(record: StrategyRecord): Activity[] {
  const { id, name, brief, events } = record
  return [...eventActivity({ id, name, brief, events }), ...moneyActivity(record)]
}

function eventActivity({ id, name, brief, events }: Pick<StrategyRecord, "id" | "name" | "brief" | "events">): Activity[] {
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
