import { Card } from "@/components/ui/card"
import { formatCompactUsd, formatPercent } from "@/lib/format"
import { type BaseToken, issuerShares } from "@/lib/markets/tokens"

export function IssuerShares({ tokens }: { tokens: BaseToken[] }) {
  return (
    <Card className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">Who issues the market</h2>
        <p className="text-ink-400 text-sm">Each issuer&apos;s share of the market cap, and how many tokens it has.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {issuerShares(tokens).map(({ issuer, count, marketCap, share }, i) => (
          <li key={issuer} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{issuer}</span>
              <span className="text-ink-400 tabular-nums">
                {count} tokens · {formatCompactUsd(marketCap)} · {formatPercent(share)}
              </span>
            </div>
            <div className="bg-ink-300/25 h-2 overflow-hidden rounded-full dark:bg-white/15">
              <div
                className="bg-primary animate-fade-up h-full rounded-full"
                style={{ width: `${share * 100}%`, "--index": i } as React.CSSProperties}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
