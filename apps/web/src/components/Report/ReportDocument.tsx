import Image from "next/image"
import type { ReactNode } from "react"

import { reportFont } from "@/config/fonts"
import type { ResearchResult } from "@/lib/research/result"
import { cn } from "@/lib/utils"

import { ResearchResultView } from "./ResearchResultView"

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

type ReportDocumentProps = {
  id: string
  name: string
  brief: string
  result: ResearchResult
  // What the person put in, or means to
  amount: number
  // When the research finished
  preparedAt: string
  // The buttons to save and share it, when there are any to show (not on a shared copy)
  actions?: ReactNode
}

// The report as a document: a cover that says what it is about, who and what it covers, then the findings, then the small print. The same
// markup is what is saved as a PDF, with the screen-only parts left out, so it reads the same on paper as on screen.
export function ReportDocument({ id, name, brief, result, amount, preparedAt, actions }: ReportDocumentProps) {
  const labels = result.charts[0]?.series[0]?.points
  const period = labels?.length ? `${labels[0]?.label} to ${labels.at(-1)?.label}` : undefined

  return (
    <article
      className={cn(
        reportFont.className,
        // A sheet of paper on the page: always light, with the border and soft shadow of a block in the Sandworm editor, and none of it on a printed page
        "report-print report-paper text-ink-100 border-hover-border block-shadow-soft flex flex-col gap-8 rounded-3xl border bg-white p-5 md:p-10",
        "print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none"
      )}
    >
      <header className="border-border-secondary flex flex-col gap-5 border-b pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Image src="/logo.svg" alt="" width={22} height={22} />
            <span className="font-tertiary tracking-wide uppercase">Sandworm</span>
            <span className="text-ink-400 font-normal">Strategy report</span>
          </p>
          {actions}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight md:text-[44px] md:leading-[52px]">{name}</h1>
          <p className="text-ink-400 max-w-2xl text-[15px] leading-6 italic">“{brief}”</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          {(
            [
              ["Prepared", date(preparedAt)],
              ["Period tested", period ?? "—"],
              ["Money", `${amount.toLocaleString("en-US")} USDC`],
              ["Report", (id.split("-").at(-1) ?? id).toUpperCase()],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-ink-400 text-xs tracking-wide uppercase">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <ResearchResultView result={result} amount={amount} />

      <footer className="text-ink-400 border-border-secondary flex flex-col gap-1.5 border-t pt-4 text-xs leading-5">
        <p>
          Made by Sandworm Stocks on {date(preparedAt)}. Every number comes from the Sandworm notebook linked above and can be opened and
          re-run.
        </p>
        <p>
          This is a test of how the strategy would have done on past prices, after trading costs. Past results don't predict future ones, and you
          can lose money. It isn't financial advice.
        </p>
      </footer>
    </article>
  )
}
