import type { Report } from "@/types/report"

type Performance = Report["performance"]

export type GrowthRow = { label: string; portfolio: number; benchmark: number; held: boolean }
export type DrawdownRow = { label: string; portfolio: number; benchmark: number }

const monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" })

function monthLabel(start: string, offset: number) {
  const [year = 1970, month = 1] = start.split("-").map(Number)
  return monthFormat.format(new Date(Date.UTC(year, month - 1 + offset, 1)))
}

export function growthRows({ start, holdoutMonths, portfolio, benchmark }: Performance): GrowthRow[] {
  return portfolio.map((value, i) => ({
    label: monthLabel(start, i),
    portfolio: value / 100,
    benchmark: (benchmark[i] ?? value) / 100,
    held: i >= portfolio.length - 1 - holdoutMonths,
  }))
}

// How far below its highest point so far each value is, as a negative share
function belowPeak(values: number[]) {
  let peak = 0
  return values.map((value) => {
    peak = Math.max(peak, value)
    return value / peak - 1
  })
}

export function drawdownRows({ start, portfolio, benchmark }: Performance): DrawdownRow[] {
  const own = belowPeak(portfolio)
  const market = belowPeak(benchmark)
  return own.map((value, i) => ({ label: monthLabel(start, i), portfolio: value, benchmark: market[i] ?? 0 }))
}
