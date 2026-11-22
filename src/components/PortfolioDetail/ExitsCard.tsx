import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { Badge } from "@/components/ui/badge"
import { Card, CardRow } from "@/components/ui/card"

// How the portfolio gets out of a stock, and whether each way is switched on
const EXITS = [
  { title: "Stop-loss", description: "Sell a stock if it falls 15% from cost", state: "Off" },
  { title: "Take-profit", description: "Sell a stock if it rises 30% from cost", state: "Off" },
  { title: "Rebalance", description: "Back to 15% each if any drifts past 17%", state: "Monthly" },
]

export function ExitsCard({ portfolioId }: { portfolioId: string }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <span className="text-ink-400 text-sm">Exits</span>
        <h3 className="text-lg font-medium">How and when you get out.</h3>
      </div>
      <Card>
        {EXITS.map(({ title, description, state }) => (
          <CardRow key={title} className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="flex flex-col">
              <span className="font-medium">{title}</span>
              <span className="text-ink-400">{description}</span>
            </span>
            <Badge>{state}</Badge>
          </CardRow>
        ))}
      </Card>
      <AppLink
        route="portfolio"
        slug={portfolioId}
        query={{ sell: "all" }}
        className={buttonVariants({ intent: "outline", size: "compact", className: "self-start" })}
      >
        Sell everything
      </AppLink>
    </section>
  )
}
