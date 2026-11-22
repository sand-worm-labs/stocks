import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { SANDWORM_APP_URL } from "@/constants/flow"

type ReportSectionProps = {
  title: string
  // The plain word for the technical name: "Max drawdown" for "How bad can it get?"
  term?: string
  // Whether the section comes from a Sandworm notebook, and so can be opened there
  notebook?: boolean
  children: ReactNode
}

export function ReportSection({ title, term, notebook = true, children }: ReportSectionProps) {
  return (
    <Card className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-medium">
          {title}
          {term && <span className="text-ink-400 ml-2 text-xs font-normal">{term}</span>}
        </h3>
        {notebook && (
          <a
            href={SANDWORM_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-400 hover:text-ink-100 text-xs underline"
          >
            Open in Sandworm ↗
          </a>
        )}
      </div>
      {children}
    </Card>
  )
}
