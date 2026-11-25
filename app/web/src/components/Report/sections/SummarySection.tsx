import { AppLink } from "@/components/AppLink/AppLink"

type SummarySectionProps = {
  summary: string[]
  portfolioId: string
  suggestAdapt: boolean
}

export function SummarySection({ summary, portfolioId, suggestAdapt }: SummarySectionProps) {
  return (
    <section className="bg-hover-bg flex flex-col gap-2 rounded-[14px] px-4 py-[18px] md:px-[22px] dark:bg-white/5">
      <h3 className="text-[13px] font-medium">The 30-second version</h3>
      <ol className="flex flex-col gap-2">
        {summary.map((line, i) => (
          <li
            key={line}
            style={{ "--index": i } as React.CSSProperties}
            className="animate-fade-up flex gap-2.5 text-[15px] leading-[23px]"
          >
            <span className="text-ink-400 tabular-nums">{i + 1}</span>
            <span>
              {line}
              {suggestAdapt && i === summary.length - 1 && (
                <>
                  {" "}
                  <AppLink route="adapt" slug={portfolioId} className="text-link font-medium hover:underline">
                    Try “less risk” →
                  </AppLink>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
