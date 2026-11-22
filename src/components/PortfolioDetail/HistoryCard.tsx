import { BaseMark } from "@/components/BaseMark/BaseMark"
import { Card, CardRow } from "@/components/ui/card"
import { BASE_SEPOLIA_EXPLORER_URL } from "@/constants/activity"
import { formatDay } from "@/lib/dates"
import type { Portfolio } from "@/lib/portfolios/types"

export function HistoryCard({ portfolio: { holdings, startedAt } }: { portfolio: Portfolio }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <span className="text-ink-400 text-sm">History</span>
        <h3 className="text-lg font-medium">Every trade, with its receipt.</h3>
      </div>
      <Card>
        {holdings.map(({ symbol, cost }) => (
          <CardRow key={symbol} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="flex flex-col">
              <span className="font-medium">Bought {symbol}</span>
              <span className="text-ink-400">
                {startedAt && `${formatDay(startedAt)} · `}
                {cost} USDC
              </span>
            </span>
            <a
              href={BASE_SEPOLIA_EXPLORER_URL}
              title="Base Sepolia explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-400 hover:text-ink-100 inline-flex items-center gap-1.5 text-xs"
            >
              <BaseMark size={14} />
              tx
            </a>
          </CardRow>
        ))}
      </Card>
    </section>
  )
}
