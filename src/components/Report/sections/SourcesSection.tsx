import { SANDWORM_APP_URL } from "@/constants/flow"
import type { Report } from "@/lib/report/types"
import { ReportSection } from "../ReportSection"

export function SourcesSection({ sources }: { sources: Report["sources"] }) {
  return (
    <ReportSection title="Sources" notebook={false}>
      <a
        href={SANDWORM_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary text-sm font-medium hover:underline"
      >
        Open the full research in Sandworm ↗
      </a>
      <ol className="flex flex-col gap-2 text-sm">
        {sources.map(({ name, url, title }, i) => (
          <li key={name} className="flex gap-3">
            <span className="text-ink-400 w-4">{i + 1}</span>
            <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {name} <span className="text-ink-400">· {title}</span>
            </a>
          </li>
        ))}
      </ol>
    </ReportSection>
  )
}
