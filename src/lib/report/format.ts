import { formatPercent } from "@/lib/format"

import type { Metric } from "./types"

export function formatMetric({ value, kind }: Pick<Metric, "value" | "kind">) {
  if (kind === "percent") return formatPercent(value, { signed: true })
  return kind === "multiple" ? `${value.toFixed(2)}×` : value.toFixed(2)
}
