import { ReportSection } from "../ReportSection"

export function SummarySection({ summary }: { summary: string[] }) {
  return (
    <ReportSection title="The 30-second version" notebook={false}>
      <ol className="flex flex-col gap-3">
        {summary.map((line, i) => (
          <li key={line} className="flex gap-3 text-sm">
            <span className="bg-inputBg text-ink-400 flex size-6 flex-none items-center justify-center rounded-full text-xs dark:bg-white/10">
              {i + 1}
            </span>
            {line}
          </li>
        ))}
      </ol>
    </ReportSection>
  )
}
