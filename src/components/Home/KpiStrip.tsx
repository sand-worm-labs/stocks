import { KpiFigure } from "@/components/Kpi/KpiFigure"
import { Card } from "@/components/ui/card"
import type { Kpi } from "@/lib/home/types"

export function KpiStrip({ kpis }: { kpis: Kpi[] }) {
  return (
    <Card className="bg-border-secondary dark:bg-border-tertiary grid grid-cols-2 gap-px overflow-hidden md:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.id} className="bg-block-surface">
          <KpiFigure kpi={kpi} />
        </div>
      ))}
    </Card>
  )
}
