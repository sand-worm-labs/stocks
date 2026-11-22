import { Card } from "@/components/ui/card"
import { formatCompactUsd, formatPercent } from "@/lib/format"
import type { BaseToken } from "@/lib/markets/tokens"

type Entry = { token: BaseToken; value: number; cumulative: number }

type ParetoChartProps = {
  title: string
  // What "reach" tokens are, in a sentence: "hold 80% of the market cap"
  claim: string
  total: number
  count: number
  reach: number
  entries: Entry[]
}

const HEIGHT = 160

// Bars for the biggest tokens, and a line for the share they have added up to
export function ParetoChart({ title, claim, total, count, reach, entries }: ParetoChartProps) {
  const max = entries[0]?.value ?? 1
  const line = entries
    .map(({ cumulative }, i) => `${((i + 0.5) / entries.length) * 100},${HEIGHT - cumulative * HEIGHT}`)
    .join(" ")

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm">
          <span className="text-primary font-medium">
            {reach} of {count}
          </span>{" "}
          tokens {claim}. All together that is {formatCompactUsd(total)}.
        </p>
      </div>

      <div className="relative" style={{ height: HEIGHT }}>
        <div
          aria-hidden="true"
          className="border-ink-300 absolute inset-x-0 border-t border-dashed"
          style={{ top: HEIGHT * 0.2 }}
        />
        <span className="text-ink-400 absolute -top-4 right-0 text-[10px]">80%</span>
        <div className="absolute inset-0 flex items-end gap-1">
          {entries.map(({ token, value }, i) => (
            <div
              key={token.id}
              title={`${token.symbol}: ${formatCompactUsd(value)}`}
              className="animate-fade-up bg-primary/80 min-w-0 flex-1 rounded-t"
              style={{ height: `${(value / max) * 100}%`, "--index": i } as React.CSSProperties}
            />
          ))}
        </div>
        <svg
          viewBox={`0 0 100 ${HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="text-ink-100 pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          <polyline
            points={line}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <ol className="text-ink-400 flex gap-1 text-[10px]">
        {entries.map(({ token }) => (
          <li key={token.id} className="min-w-0 flex-1 truncate text-center" title={token.symbol}>
            {token.symbol.replace(/c$/, "")}
          </li>
        ))}
      </ol>

      <p className="text-ink-400 text-xs">
        The bars are each token, biggest first. The line is the share they have added up to, so where it crosses the
        dashed line is 80%.{" "}
        {entries[0] && `${entries[0].token.symbol} alone is ${formatPercent(entries[0].cumulative)}.`}
      </p>
    </Card>
  )
}
