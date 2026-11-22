import { SourceLink } from "@/components/SourceLink/SourceLink"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Badge } from "@/components/ui/badge"
import type { Report } from "@/lib/report/types"

import { ReportSection } from "../ReportSection"

export function ResearchSection({ research }: { research: Report["research"] }) {
  return (
    <ReportSection title="Why these four?">
      <p className="text-sm">
        Robotics is a small part of each company. The pure robotics names can&apos;t be bought on Base yet.
      </p>
      <ul className="flex flex-col gap-3">
        {research.map(({ symbol, text, label, source }) => (
          <li key={symbol} className="flex items-start gap-3 text-sm">
            <StockAvatar symbol={symbol} className="size-7" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-medium">{symbol}</span>
              <span>
                {text} {source ? <SourceLink {...source} /> : <span className="text-ink-400">No source yet</span>}
              </span>
            </span>
            <Badge tone={label === "Fact" ? "info" : "neutral"}>{label}</Badge>
          </li>
        ))}
      </ul>
    </ReportSection>
  )
}
