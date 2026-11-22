import { SourceList } from "@/components/SourceLink/SourceList"
import { SourcePill } from "@/components/SourceLink/SourcePill"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Badge } from "@/components/ui/badge"
import type { Report } from "@/lib/report/types"

import { ReportSection, SectionIntro } from "../ReportSection"

const LABEL_TONE = { Fact: "info", Assumption: "warning", Opinion: "neutral" } as const

type ResearchSectionProps = { research: Report["research"]; note?: Report["researchNote"] }

export function ResearchSection({ research, note }: ResearchSectionProps) {
  return (
    <ReportSection title="Selection">
      <SectionIntro>
        Robotics is a small part of each company. The pure robotics names can&apos;t be bought on Base yet.
      </SectionIntro>
      <ul>
        {research.map(({ symbol, text, label, source }) => (
          <li
            key={symbol}
            className="border-border-secondary dark:border-border-tertiary grid grid-cols-[88px_minmax(0,1fr)_auto] items-start gap-3.5 border-t py-3 first:border-t-0 sm:grid-cols-[110px_minmax(0,1fr)_auto]"
          >
            <span className="flex items-center gap-2 text-xs leading-[22px]">
              <StockAvatar symbol={symbol} className="size-[22px]" />
              {symbol}
            </span>
            <span className="flex flex-col items-start gap-1.5">
              <span className="text-sm leading-[22px]">{text}</span>
              {source ? <SourcePill {...source} /> : <Badge tone="outline">No source yet</Badge>}
            </span>
            <Badge tone={LABEL_TONE[label]}>{label}</Badge>
          </li>
        ))}
      </ul>
      {note && (
        <>
          <p className="text-ink-200 text-[13px] leading-5">{note.text}</p>
          <SourceList sources={note.sources} asOf={note.asOf} />
        </>
      )}
    </ReportSection>
  )
}
