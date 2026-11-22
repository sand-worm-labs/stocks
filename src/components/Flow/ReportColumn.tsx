import type { Report } from "@/lib/report/types"

import { ChecksSection } from "../Report/sections/ChecksSection"
import { ConcentrationSection } from "../Report/sections/ConcentrationSection"
import { DrawdownSection } from "../Report/sections/DrawdownSection"
import { LiquiditySection } from "../Report/sections/LiquiditySection"
import { PeriodsSection } from "../Report/sections/PeriodsSection"
import { ResearchSection } from "../Report/sections/ResearchSection"
import { SourcesSection } from "../Report/sections/SourcesSection"
import { SummarySection } from "../Report/sections/SummarySection"
import { ToleranceSection } from "../Report/sections/ToleranceSection"

// Every section of the first version of a report, in reading order
export function ReportColumn({ report, portfolioId }: { report: Report; portfolioId: string }) {
  const { checks, concentration, liquidity, research, sources, summary } = report

  return (
    <>
      <SummarySection summary={summary} />
      <ChecksSection title="Edge or gambling?" term="Honesty check" checks={checks.honesty} />
      <PeriodsSection report={report} />
      <ChecksSection
        title="Can we trust the backtest?"
        term="Bias check"
        intro="Mostly. Four checks pass. One warns: the test only uses today's winners, so the numbers are likely too high."
        checks={checks.bias}
      />
      <DrawdownSection report={report} />
      <ToleranceSection report={report} portfolioId={portfolioId} />
      <ConcentrationSection concentration={concentration} />
      <ChecksSection
        title="Is this luck?"
        term="Overfitting check"
        intro="Partly. A 3-year test is short, and it was a strong time for big tech."
        checks={checks.overfit}
      />
      <LiquiditySection liquidity={liquidity} />
      <ResearchSection research={research} />
      <SourcesSection sources={sources} />
    </>
  )
}
