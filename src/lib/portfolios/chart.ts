import { getFundHistory, getTokenHistory, type HistoryWindow, type PricePoint, windowFor } from "@/lib/markets/history"
import { getBaseTokens } from "@/lib/markets/tokens"
import { getOwnStrategies } from "@/lib/strategies/source"
import type { Benchmark } from "@/types/benchmarks"

import type { Portfolio } from "@/types/portfolios"
import { valueHistory, type ValuePoint } from "./history"
import { isLive } from "./portfolio"

export type ChartEvent = { time: number; label: string }

export type ChartData = {
  histories: Record<string, ValuePoint[]>
  funds: Record<string, PricePoint[]>
  events: ChartEvent[]
}

// Funds are asked for a few at a time, so a cold start isn't dozens of requests at once
const AT_ONCE = 10

async function inChunks<T, R>(items: T[], run: (item: T) => Promise<R>) {
  const out: R[] = []
  for (let i = 0; i < items.length; i += AT_ONCE) out.push(...(await Promise.all(items.slice(i, i + AT_ONCE).map(run))))
  return out
}

// Nothing if none of the portfolios was made here: the made-up ones have no real prices to be worked out from.
export async function getChartData(
  portfolios: Portfolio[],
  benchmarks: Benchmark[],
  nowMs = Date.now()
): Promise<ChartData | undefined> {
  const own = new Set((await getOwnStrategies()).map(({ id }) => id))
  const real = portfolios.filter((portfolio) => isLive(portfolio) && own.has(portfolio.id) && portfolio.startedAt)
  if (!real.length) return undefined

  const since = Math.min(...real.map(({ startedAt }) => new Date(startedAt ?? nowMs).getTime()))
  const window: HistoryWindow = windowFor(since, nowMs)
  const tokens = await getBaseTokens().catch(() => [])
  const idOf = new Map(tokens.map(({ symbol, id }) => [symbol, id]))

  const symbols = [...new Set(real.flatMap(({ holdings }) => holdings.map(({ symbol }) => symbol)))]
  const prices = Object.fromEntries(
    await Promise.all(
      symbols.map(
        async (symbol) =>
          [symbol, idOf.has(symbol) ? await getTokenHistory(idOf.get(symbol) ?? "", window) : []] as const
      )
    )
  )
  const histories = Object.fromEntries(
    real.flatMap((portfolio) => {
      const history = valueHistory(portfolio, prices, nowMs)
      return history ? [[portfolio.id, history] as const] : []
    })
  )

  const funds = Object.fromEntries(
    (await inChunks(benchmarks, async ({ id }) => [id, await getFundHistory(id, window)] as const)).filter(
      ([, history]) => history.length
    )
  )

  return {
    histories,
    funds,
    events: real.map(({ name, startedAt }) => ({
      time: Math.floor(new Date(startedAt ?? nowMs).getTime() / 1000),
      label: `${name} started`,
    })),
  }
}
