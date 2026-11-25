import { Card } from "@/components/ui/card"
import type { Report } from "@/types/report"

import { CheckList } from "../CheckList"
import { ReportSection, SectionIntro } from "../ReportSection"
import { VerdictPill } from "../VerdictPill"

type ChecksSectionProps = {
  title: string
  intro?: string
  checks: Report["checks"]["honesty"]
  verdict?: Report["verdict"]
}

export function ChecksSection({ title, intro, checks, verdict }: ChecksSectionProps) {
  if (verdict) {
    return (
      <Card raised className="flex flex-col gap-1.5 rounded-[14px] px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[17px] font-medium">{title}</h3>
          <VerdictPill verdict={verdict} />
        </div>
        <CheckList checks={checks} />
      </Card>
    )
  }

  return (
    <ReportSection title={title}>
      {intro && <SectionIntro>{intro}</SectionIntro>}
      <CheckList checks={checks} />
    </ReportSection>
  )
}
