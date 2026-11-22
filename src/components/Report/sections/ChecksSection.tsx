import type { Check } from "@/lib/report/types"

import { CheckList } from "../CheckList"
import { ReportSection } from "../ReportSection"

type ChecksSectionProps = { title: string; term: string; intro?: string; checks: Check[] }

export function ChecksSection({ title, term, intro, checks }: ChecksSectionProps) {
  return (
    <ReportSection title={title} term={term}>
      {intro && <p className="text-sm">{intro}</p>}
      <CheckList checks={checks} />
    </ReportSection>
  )
}
