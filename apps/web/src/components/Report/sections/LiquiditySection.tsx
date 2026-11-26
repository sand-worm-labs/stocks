import { Money } from "@/components/Money/Money"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { CELL } from "@/constants/components/report/sections/liquidity-section"
import { formatPercent } from "@/lib/format"
import type { Report } from "@/types/report"

import { ReportSection, SectionIntro } from "../ReportSection"

type LiquiditySectionProps = { liquidity: Report["liquidity"]; venue: Report["venue"] }

export function LiquiditySection({ liquidity, venue }: LiquiditySectionProps) {
  return (
    <ReportSection title="Tradability">
      <SectionIntro>
        Yes. All four have more than $100K of liquidity on Base, and tokens track their shares within 0.3%.
      </SectionIntro>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-ink-400 text-xs font-medium">
              <th scope="col" className="pb-1.5 text-left font-medium">
                Token
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                Token price
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                Share price
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                Gap
              </th>
            </tr>
          </thead>
          <tbody>
            {liquidity.map(({ symbol, token, share }) => (
              <tr key={symbol}>
                <td className={CELL}>
                  <span className="flex items-center gap-2 text-xs">
                    <StockAvatar symbol={symbol} className="size-5" />
                    {symbol}
                  </span>
                </td>
                <td className={`${CELL} text-right tabular-nums`}>
                  <Money value={token} />
                </td>
                <td className={`${CELL} text-ink-200 text-right tabular-nums`}>
                  <Money value={share} />
                </td>
                <td className={`${CELL} text-right tabular-nums`}>
                  {formatPercent(token / share - 1, { signed: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl>
        {venue.facts.map(({ label, value }) => (
          <div
            key={label}
            className="border-border-secondary dark:border-border-tertiary flex justify-between gap-3 border-t py-2 text-[13px] leading-5"
          >
            <dt className="text-ink-200">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-ink-400 text-xs leading-[18px]">
        On weekends the token can drift from the share price. The agent won&apos;t buy if the gap is over 1%.
      </p>
    </ReportSection>
  )
}
