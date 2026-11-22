import type { Report } from "@/lib/report/types"

import { ChecksSection } from "../Report/sections/ChecksSection"
import { ConcentrationSection } from "../Report/sections/ConcentrationSection"
import { DrawdownSection } from "../Report/sections/DrawdownSection"
import { LiquiditySection } from "../Report/sections/LiquiditySection"
import { ResearchSection } from "../Report/sections/ResearchSection"
import { SourcesSection } from "../Report/sections/SourcesSection"
import { SummarySection } from "../Report/sections/SummarySection"
import { ToleranceSection } from "../Report/sections/ToleranceSection"
import { VsBenchmarkSection } from "../Report/sections/VsBenchmarkSection"

// Every section of the first version of a report, in reading order
export function ReportColumn({ report, portfolioId }: { report: Report; portfolioId: string }) {
  const { checks, concentration, liquidity, research, researchNote, sources, summary, tolerance, venue, verdict } =
    report

  return (
    <>
      <SummarySection summary={summary} portfolioId={portfolioId} suggestAdapt={!tolerance.fits} />
      <ChecksSection title="Edge or gambling?" checks={checks.honesty} verdict={verdict} />
      <VsBenchmarkSection report={report} />
      <DrawdownSection report={report} />
      <ToleranceSection report={report} portfolioId={portfolioId} />
      <ConcentrationSection concentration={concentration} />
      <ChecksSection
        title="Robustness"
        intro="Partly. A 3-year test is short, and it was a strong time for big tech."
        checks={checks.overfit}
      />
      <LiquiditySection liquidity={liquidity} venue={venue} />
      <ResearchSection research={research} note={researchNote} />
      <SourcesSection sources={sources} />
    </>
  )
}
