import type { Metadata } from "next"

import { IssuerShares } from "@/components/Markets/IssuerShares"
import { LiveBadge } from "@/components/Markets/LiveBadge"
import { MarketStats } from "@/components/Markets/MarketStats"
import { MarketTabs } from "@/components/Markets/MarketTabs"
import { ParetoChart } from "@/components/Markets/ParetoChart"
import { PageHeader } from "@/components/PageHeader/PageHeader"
import { Reveal } from "@/components/Reveal/Reveal"
import { getBaseTokens, pareto } from "@/lib/markets/tokens"

export const metadata: Metadata = { title: "Market summary" }

export default async function MarketSummaryPage() {
  const tokens = await getBaseTokens()
  const byCap = pareto(tokens, ({ marketCap }) => marketCap)
  const byVolume = pareto(tokens, ({ volume }) => volume)

  return (
    <>
      <div className="flex flex-col gap-6">
        <MarketTabs current="marketSummary" />
        <PageHeader
          title="Market summary"
          description="Every tokenized stock on Base. The list comes from CoinGecko, the prices from the pools they trade in."
          actions={<LiveBadge />}
        />
        <Reveal index={1}>
          <MarketStats tokens={tokens} />
        </Reveal>
        <Reveal index={2}>
          <div className="grid gap-4 lg:grid-cols-2">
            <ParetoChart
              title="Where the market cap sits"
              claim="hold 80% of the market cap"
              total={byCap.total}
              count={byCap.count}
              reach={byCap.reach}
              entries={byCap.shown}
            />
            <ParetoChart
              title="Where the trading happens"
              claim="make up 80% of the volume"
              total={byVolume.total}
              count={byVolume.count}
              reach={byVolume.reach}
              entries={byVolume.shown}
            />
          </div>
        </Reveal>
        <Reveal index={3}>
          <IssuerShares tokens={tokens} />
        </Reveal>
      </div>
    </>
  )
}
