import { SellDialog } from "@/components/PortfolioDetail/SellDialog"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { Portfolio } from "@/lib/portfolios/types"

// How the portfolio gets out of a stock, and whether each way is switched on
const EXITS = [
  { title: "Stop-loss", description: "Sell a stock if it falls 15% from cost", state: "Off" },
  { title: "Take-profit", description: "Sell a stock if it rises 30% from cost", state: "Off" },
  { title: "Rebalance", description: "Back to 15% each if any drifts past 17%", state: "Monthly" },
]

export function ExitsCard({ portfolio }: { portfolio: Portfolio }) {
  return (
    <Card className="flex flex-col gap-3 rounded-[14px] p-4 md:px-6 md:py-[22px]">
      <h3 className="text-[17px] font-medium">How and when you get out.</h3>
      <ul>
        {EXITS.map(({ title, description, state }) => (
          <li
            key={title}
            className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-t py-2.5 first:border-t-0"
          >
            <span className="flex flex-col">
              <span className="text-sm">{title}</span>
              <span className="text-ink-400 text-xs">{description}</span>
            </span>
            <Badge tone={state === "Off" ? "neutral" : "info"}>{state}</Badge>
          </li>
        ))}
      </ul>
      <SellDialog portfolio={portfolio} className="mt-1 self-start" />
    </Card>
  )
}
