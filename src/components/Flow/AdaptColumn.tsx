import type { ReactNode } from "react"

import type { Report } from "@/types/report"

import { AllocationSection } from "../Report/sections/AllocationSection"
import { ComparisonSection } from "../Report/sections/ComparisonSection"
import { LiquiditySection } from "../Report/sections/LiquiditySection"
import { ResearchSection } from "../Report/sections/ResearchSection"
import { SourcesSection } from "../Report/sections/SourcesSection"
import { ToleranceSection } from "../Report/sections/ToleranceSection"

type AdaptColumnProps = { report: Report; portfolioId: string; actions?: ReactNode }

export function AdaptColumn({ report, portfolioId, actions }: AdaptColumnProps) {
  return (
    <>
      <AllocationSection report={report} />
      <ToleranceSection report={report} portfolioId={portfolioId} />
      {report.comparison && <ComparisonSection comparison={report.comparison} actions={actions} />}
      <LiquiditySection liquidity={report.liquidity} venue={report.venue} />
      <ResearchSection research={report.research} note={report.researchNote} />
      <SourcesSection sources={report.sources} />
    </>
  )
}
