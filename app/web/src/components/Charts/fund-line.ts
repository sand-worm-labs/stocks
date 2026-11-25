import type { ISeriesApi, UTCTimestamp } from "lightweight-charts"

import { plotted, type View, withAlpha } from "@/lib/charts/trading"

export type Fund = { series: ISeriesApi<"Line">; color: string; progress: number; wanted: boolean; frame?: number }

export function drawFund(fund: Fund, values: number[] | undefined, times: UTCTimestamp[], view: View, base: number) {
  const shown = Math.round(fund.progress * times.length)
  fund.series.setData(
    times.slice(0, shown).map((time, i) => ({ time, value: plotted(values?.[i] ?? base, base, view) }))
  )
  fund.series.applyOptions({ color: withAlpha(fund.color, Math.min(1, fund.progress * 1.8)) })
}
