import type { ReactNode } from "react"

import type { Report } from "@/lib/report/types"

import { AllocationSection } from "../Report/sections/AllocationSection"
import { ComparisonSection } from "../Report/sections/ComparisonSection"
import { LiquiditySection } from "../Report/sections/LiquiditySection"
import { ResearchSection } from "../Report/sections/ResearchSection"
import { SourcesSection } from "../Report/sections/SourcesSection"
import { ToleranceSection } from "../Report/sections/ToleranceSection"

type AdaptColumnProps = { report: Report; portfolioId: string; actions?: ReactNode }

// The less-risk version of a report: what changed, whether it fits, and how it compares with before
export function AdaptColumn({ report, portfolioId, actions }: AdaptColumnProps) {
  return (
    <>
      <AllocationSection report={report} />
      <ToleranceSection report={report} portfolioId={portfolioId} />
      {report.comparison && <ComparisonSection comparison={report.comparison} actions={actions} />}
      <LiquiditySection liquidity={report.liquidity} />
      <ResearchSection research={report.research} />
      <SourcesSection sources={report.sources} />
    </>
  )
}
