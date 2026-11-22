import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { formatPercent } from "@/lib/format"
import type { Report } from "@/lib/report/types"
import { cn } from "@/lib/utils"

import { ReportSection, SectionIntro } from "../ReportSection"

type ToleranceSectionProps = { report: Report; portfolioId: string }

// Leaves a little room past the longer of the two marks
const HEADROOM = 1.17

// How far down the portfolio fell, against the loss its owner said they could live with
export function ToleranceSection({ report: { tolerance, version }, portfolioId }: ToleranceSectionProps) {
  const { panic, worst, fits, text } = tolerance
  const scale = Math.max(Math.abs(worst), Math.abs(panic), 0.05) * HEADROOM
  const worstAt = `${(Math.abs(worst) / scale) * 100}%`
  const panicAt = `${(Math.abs(panic) / scale) * 100}%`

  return (
    <ReportSection title="Drawdown tolerance">
      <SectionIntro>{text}</SectionIntro>
      <div className="flex flex-col gap-2">
        <div
          className="bg-hover-bg relative h-[22px] rounded-md dark:bg-white/10"
          role="img"
          aria-label={`Worst drop ${formatPercent(worst)} against the ${formatPercent(panic)} you'd panic at`}
        >
          <span
            style={{ width: worstAt }}
            className={cn(
              "animate-grow-x absolute inset-y-0 left-0 rounded-md opacity-85",
              fits ? "bg-emerald-600" : "bg-red-700"
            )}
          />
          <span style={{ left: panicAt }} className="bg-ink-100 absolute -inset-y-1.5 w-0.5" />
        </div>
        <div className="relative h-[34px] text-xs leading-4">
          <span className="text-ink-400 absolute left-0">0%</span>
          <span style={{ left: panicAt }} className="absolute -translate-x-1/2 text-center font-medium">
            {formatPercent(panic)}
            <br />
            <span className="text-ink-400 font-normal">you&apos;d panic</span>
          </span>
          <span
            style={{ left: worstAt }}
            className={cn(
              "absolute top-0 -translate-x-1/2 text-center font-medium",
              fits ? "text-emerald-700" : "text-red-700 dark:text-red-400"
            )}
          >
            {formatPercent(worst)}
            <br />
            <span className="text-ink-400 font-normal">worst drop</span>
          </span>
        </div>
      </div>
      {!fits && version === 1 && (
        <div>
          <AppLink route="adapt" slug={portfolioId} className={buttonVariants({ intent: "outline", size: "compact" })}>
            Show me a version that fits
          </AppLink>
        </div>
      )}
    </ReportSection>
  )
}
