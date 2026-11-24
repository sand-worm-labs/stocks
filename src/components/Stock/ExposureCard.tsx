import { AppLink } from "@/components/AppLink/AppLink"
import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { Card, CardRow } from "@/components/ui/card"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatDay } from "@/lib/dates"
import { formatAmount, formatPercent, formatSignedAmount } from "@/lib/format"
import type { exposureTo } from "@/lib/portfolios/portfolio"
import { changeTone } from "@/lib/tone"

export function ExposureCard({ exposures }: { exposures: ReturnType<typeof exposureTo> }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="In your strategies" />
      <Card>
        {exposures.map(({ portfolio, value, weight, gain, gainRate }) => (
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
    </section>
  )
}
