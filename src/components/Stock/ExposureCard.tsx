"use client"

import { useRef, useState } from "react"

import { AppLink } from "@/components/AppLink/AppLink"
import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { Card, CardRow } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { EXPOSURES_PER_PAGE } from "@/constants/token"
import { formatDay } from "@/lib/dates"
import { formatAmount, formatPercent, formatSignedAmount } from "@/lib/format"
import type { exposureTo } from "@/lib/portfolios/portfolio"
import { changeTone } from "@/lib/tone"

// The strategies that hold a stock, a page at a time: a stock held by many would otherwise run down the page
export function ExposureCard({ exposures }: { exposures: ReturnType<typeof exposureTo> }) {
  const [requested, setPage] = useState(0)
  const top = useRef<HTMLElement>(null)
  // The list can shorten under the page, as live values change what is held
  const page = Math.min(requested, Math.max(Math.ceil(exposures.length / EXPOSURES_PER_PAGE) - 1, 0))
  const go = (next: number) => {
    setPage(next)
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <section ref={top} className="flex scroll-mt-[calc(var(--shell-top)+1rem)] flex-col gap-3">
      <SectionHeader title="In your strategies" />
      <Card>
        {exposures
          .slice(page * EXPOSURES_PER_PAGE, (page + 1) * EXPOSURES_PER_PAGE)
          .map(({ portfolio, value, weight, gain, gainRate }) => (
            <CardRow key={portfolio.id}>
              <AppLink
                route="portfolio"
                slug={portfolio.id}
                className="hover:bg-inputBg flex flex-col gap-1 p-4 transition-colors dark:hover:bg-white/5"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">{portfolio.name}</span>
                  <span className="text-ink-400 text-sm tabular-nums">
                    {formatPercent(weight)} · {formatAmount(value)} USDC
                  </span>
                </span>
                <span className={`${TONE_TEXT_CLASSNAME[changeTone(gain)]} text-sm`}>
                  {formatSignedAmount(gain)} USDC ({formatPercent(gainRate, { signed: true })})
                  {portfolio.startedAt && ` since ${formatDay(portfolio.startedAt)}`}
                </span>
              </AppLink>
            </CardRow>
          ))}
        {!exposures.length && <p className="text-ink-400 p-4 text-sm">You don&apos;t hold this stock yet.</p>}
      </Card>
      <Pagination page={page} pageSize={EXPOSURES_PER_PAGE} total={exposures.length} onPage={go} />
    </section>
  )
}
