import type { Metadata } from "next"

import { HoldingsLive } from "@/components/Holdings/HoldingsLive"
import { PageHeader } from "@/components/PageHeader/PageHeader"
import { getStocks } from "@/lib/markets/source"
import { getHeldAddresses } from "@/lib/portfolios/addresses"
import { getPortfolios } from "@/lib/portfolios/source"

export const metadata: Metadata = { title: "Holdings" }

type HoldingsPageProps = { searchParams: Promise<{ tab?: string; view?: string; q?: string }> }

export default async function HoldingsPage({ searchParams }: HoldingsPageProps) {
  const { tab, view, q = "" } = await searchParams
  const [portfolios, stocks] = await Promise.all([getPortfolios(), getStocks()])
  const addresses = await getHeldAddresses(portfolios)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon="holdings" title="Holdings" description="Every stock you hold, and the model it is held in" />
      <HoldingsLive
        portfolios={portfolios}
        addresses={addresses}
        names={stocks.map(({ symbol, name }) => ({ symbol, name }))}
        tab={tab === "summary" ? "summary" : "list"}
        view={view === "stocks" ? "stocks" : "models"}
        query={q}
      />
    </div>
  )
}
