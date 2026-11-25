import { PiTrendDown, PiTrendUp } from "react-icons/pi"

import { AllocationBar } from "@/components/Home/AllocationBar"
import { CountUp } from "@/components/Home/CountUp"
import { KpiFigure } from "@/components/Kpi/KpiFigure"
import { Money } from "@/components/Money/Money"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatPercent } from "@/lib/format"
import type { AllocationSlice } from "@/lib/home/allocation"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"
import type { Kpi } from "@/types/home"

type HoldingsSummaryProps = {
  value: number
  gain: number
  gainRate: number
  slices: AllocationSlice[]
  figures: Kpi[]
}

export function HoldingsSummary({ value, gain, gainRate, slices, figures }: HoldingsSummaryProps) {
  return (
    <Card className="overflow-hidden bg-[radial-gradient(60%_70%_at_100%_0%,var(--mark-soft),transparent),radial-gradient(45%_50%_at_0%_100%,rgba(16,185,129,0.08),transparent)]">
      <div className="flex flex-col gap-5 p-5 md:p-6">
        <div className="flex flex-col gap-1">
          <span className="text-ink-400 text-sm">Held in stocks</span>
          <span className="flex items-center gap-3 text-[52px] leading-[56px] font-normal tracking-tight tabular-nums">
            <UsdcMark className="size-9 flex-none" />
            <CountUp value={value} />
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={changeTone(gain)} className="gap-1 text-sm">
              {gain >= 0 ? <PiTrendUp aria-hidden="true" size={14} /> : <PiTrendDown aria-hidden="true" size={14} />}
              {formatPercent(gainRate, { signed: true })}
            </Badge>
            <Money value={gain} signed className={cn("font-medium", TONE_TEXT_CLASSNAME[changeTone(gain)])} />
            <span className="text-ink-400">on what you paid</span>
          </span>
        </div>
        <AllocationBar slices={slices} />
      </div>
      <div className="bg-border-secondary dark:bg-border-tertiary grid grid-cols-2 gap-px border-t border-[inherit] md:grid-cols-4">
        {figures.map((kpi) => (
          <div key={kpi.id} className="bg-block-surface">
            <KpiFigure kpi={kpi} />
          </div>
        ))}
      </div>
    </Card>
  )
}
