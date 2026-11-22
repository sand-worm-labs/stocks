import type { ReactNode } from "react"
import { PiScales } from "react-icons/pi"

import { Badge } from "@/components/ui/badge"
import type { Report } from "@/lib/report/types"

type ReportHeaderProps = { report: Report; actions?: ReactNode }

export function ReportHeader({ report: { plan, verdict, headline }, actions }: ReportHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{plan}</p>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">{headline}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={verdict.tone}>
          <PiScales aria-hidden="true" />
          Edge or gambling: {verdict.label.toLowerCase()}
        </Badge>
      </div>
    </header>
  )
}
