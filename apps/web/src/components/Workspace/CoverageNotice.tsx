import Link from "next/link"

import { buttonVariants } from "@/components/Button/Button"
import { Card } from "@/components/ui/card"
import { routeHref } from "@/config/routes"
import { TONE_DOT_CLASSNAME } from "@/constants/tone"
import { cn } from "@/lib/utils"
import type { IdeaCoverage } from "@/types/coverage"

// Shown with the rules, before anything is locked: what the idea asked for that can't be bought on Base, and what would be tested instead. The
// person decides here, with the facts, instead of finding out from the results that the stocks they named were never tested.
export function CoverageNotice({ coverage, brief }: { coverage?: IdeaCoverage; brief: string }) {
  if (!coverage?.headline) return null

  const isMissing = coverage.couldntMatch.length > 0
  const changeIdea = `${routeHref("brief") ?? "/strategies/new/brief"}?idea=${encodeURIComponent(brief)}`

  return (
    <Card role="note" aria-label="What will be tested" className="flex flex-col gap-3 p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-[15px] font-medium">
          <span aria-hidden="true" className={cn("size-1.5 flex-none rounded-full", TONE_DOT_CLASSNAME[isMissing ? "warning" : "info"])} />
          {coverage.headline}
        </h2>
        <p className="text-ink-400 text-sm leading-6">{coverage.detail}</p>
      </div>

      {isMissing && coverage.tests.length > 0 && (
        <ul aria-label="Stocks that would be tested" className="flex flex-wrap gap-2">
          {coverage.tests.map(({ symbol, name }) => (
            <li key={symbol} title={name} className="border-border dark:border-border-tertiary rounded-full border px-2.5 py-0.5 text-xs">
              {symbol}
            </li>
          ))}
        </ul>
      )}

      {isMissing && (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={changeIdea} className={buttonVariants({ intent: "outline", size: "compact" })}>
            Change the idea
          </Link>
          <span className="text-ink-400 text-xs">Or confirm the rules to go ahead with these stocks.</span>
        </div>
      )}
    </Card>
  )
}

// A line for the pages after the rules are locked, so the results are never read as a test of what isn't on Base
export function CoverageStrip({ coverage }: { coverage?: IdeaCoverage }) {
  if (!coverage?.couldntMatch.length) return null

  return (
    <p role="note" className="border-border-secondary dark:border-border-tertiary text-ink-400 rounded-xl border px-4 py-2.5 text-sm leading-6">
      <span className="text-ink-100 font-medium">Tested on {coverage.tests.map(({ symbol }) => symbol).join(", ")}.</span> Not tested:{" "}
      {coverage.couldntMatch.join(", ")}, which {coverage.couldntMatch.length === 1 ? "isn't" : "aren't"} on Base yet.
    </p>
  )
}
