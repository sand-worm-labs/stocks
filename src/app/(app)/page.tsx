import type { Metadata } from "next"

import { ActivityFeed } from "@/components/Home/ActivityFeed"
import { AttentionList } from "@/components/Home/AttentionList"
import { HeldStocks } from "@/components/Home/HeldStocks"
import { IdeasToTry } from "@/components/Home/IdeasToTry"
import { KpiStrip } from "@/components/Home/KpiStrip"
import { PortfolioPreviews } from "@/components/Home/PortfolioPreviews"
import { PageHeader } from "@/components/PageHeader/PageHeader"
import { NewPortfolioButton } from "@/components/Portfolios/NewPortfolioButton"
import { TRADING_MODE_LABEL } from "@/constants/portfolio"
import { formatLongDate, greetingFor } from "@/lib/dates"
import { getHome } from "@/lib/home/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Home" }

export default async function HomePage() {
  const [session, home] = await Promise.all([getSession(), getHome()])
  const { user, network, now } = session

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${greetingFor(now)}, ${user.firstName}`}
        description={
          <>
            {formatLongDate(now)} · {TRADING_MODE_LABEL[network.mode].toLowerCase()} trading on {network.chain}
          </>
        }
        actions={<NewPortfolioButton />}
      />
      <KpiStrip kpis={home.kpis} />
      <AttentionList items={home.attention} />
      <PortfolioPreviews portfolios={home.portfolios} />
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <ActivityFeed activity={home.activity} now={now} />
        <div className="flex flex-col gap-8">
          <HeldStocks stocks={home.heldStocks} />
          <IdeasToTry ideas={home.ideas} />
        </div>
      </div>
    </div>
  )
}
