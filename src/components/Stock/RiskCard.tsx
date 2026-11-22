import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatDecimal, formatPercent } from "@/lib/format"
import type { StockDetail } from "@/lib/markets/types"

export function RiskCard({ risk }: { risk: NonNullable<StockDetail["risk"]> }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Risk in one line" />
      <Card className="flex flex-col items-start gap-3 p-4 text-sm">
        <p>
          Swings about {formatDecimal(risk.beta)}× as much as the market <Badge>Beta {formatDecimal(risk.beta)}</Badge>.
          Its worst drop in the last 3 years was {formatPercent(risk.worstDrop, { signed: true })}.
        </p>
      </Card>
    </section>
  )
}
