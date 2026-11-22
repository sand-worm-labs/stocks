import { SourcePill } from "@/components/SourceLink/SourcePill"
import { formatAsOf } from "@/lib/dates"
import type { Source } from "@/lib/markets/types"

// "Data" and the sources it came from, and when
export function SourceList({ sources, asOf }: { sources: Source[]; asOf: string }) {
  return (
    <p className="text-ink-400 flex flex-wrap items-center gap-1.5 text-xs">
      <span>Data</span>
      {sources.map((source) => (
        <SourcePill key={source.url} {...source} />
      ))}
      <span>· as of {formatAsOf(asOf)}</span>
    </p>
  )
}
