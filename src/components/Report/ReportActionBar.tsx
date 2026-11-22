import type { ReactNode } from "react"

import type { Report } from "@/lib/report/types"
import { cn } from "@/lib/utils"

import { VerdictPill } from "./VerdictPill"

type ReportActionBarProps = { plan: string; verdict: Report["verdict"]; children?: ReactNode }

// What the portfolio would do and the verdict on it, with what to do about it. With actions it stays under the header
// while the report scrolls.
export function ReportActionBar({ plan, verdict, children }: ReportActionBarProps) {
  return (
    <div
      className={cn(
        "border-border-secondary bg-block-surface/95 dark:border-border-tertiary flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md",
        children && "sticky top-[calc(var(--shell-top)+0.5rem)] z-20 shadow-sm"
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-[15px] leading-[22px] font-medium">{plan}</p>
        <span>
          <VerdictPill verdict={verdict} />
        </span>
      </div>
      {children && <div className="flex flex-none flex-wrap gap-2">{children}</div>}
    </div>
  )
}
