import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { SANDWORM_APP_URL } from "@/constants/flow"
import { cn } from "@/lib/utils"

type ReportSectionProps = {
  title: string
  // Whether the section comes from a Sandworm notebook, and so can be opened there
  notebook?: boolean
  className?: string
  children: ReactNode
}

export function ReportSection({ title, notebook = true, className, children }: ReportSectionProps) {
  return (
    <Card className={cn("flex min-w-0 flex-col gap-3.5 rounded-[14px] p-4 md:px-6 md:py-[22px]", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl leading-7 font-medium tracking-tight">{title}</h3>
        {notebook && (
          <a
            href={SANDWORM_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent dark:text-primary text-xs font-normal whitespace-nowrap hover:underline"
          >
            View source ↗
          </a>
        )}
      </div>
      {children}
    </Card>
  )
}

export function SectionIntro({ children }: { children: ReactNode }) {
  return <p className="text-ink-200 text-[15px] leading-[23px]">{children}</p>
}
