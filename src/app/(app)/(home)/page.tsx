import type { Metadata } from "next"

import { ActivityFeed } from "@/components/Home/ActivityFeed"
import { AttentionList } from "@/components/Home/AttentionList"
import { GettingStarted } from "@/components/Home/GettingStarted"
import { HomeLayout } from "@/components/Home/HomeLayout"
import { HomeSummaryLive } from "@/components/Home/HomeSummaryLive"
import { PortfolioPreviewsLive } from "@/components/Home/PortfolioPreviewsLive"
import { StarterPortfolios } from "@/components/Home/StarterPortfolios"
import { StartInvesting } from "@/components/Home/StartInvesting"
import { StockList } from "@/components/Home/StockList"
import { PageHeader } from "@/components/PageHeader/PageHeader"
import { AddFundsDialog } from "@/components/PortfolioDetail/AddFundsDialog"
import { displayFont } from "@/config/fonts"
import { getHome } from "@/lib/home/source"
import { pickStarters } from "@/lib/onboarding/starters"
import { getSession } from "@/lib/session/source"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Home" }

export default async function HomePage() {
  const [session, home] = await Promise.all([getSession(), getHome()])
  const { user, now, interests, network } = session
  const isNew = home.portfolios.length === 0

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        titleClassName={cn(
          displayFont.className,
          "text-[44px] leading-[48px] font-normal tracking-tight md:text-[60px] md:leading-[64px]"
        )}
        title={
          <>
            GM, <span className="pr-1 italic">{user.firstName}</span>
          </>
        }
      />
      <HomeLayout
        rail={
          isNew ? (
            <>
              <GettingStarted hasPortfolio={false} hasBought={false} />
              <StockList
                title="Popular stocks"
                stocks={home.popularStocks}
                link={{ route: "markets", label: "Markets →" }}
              />
            </>
          ) : (
            <>
              <GettingStarted hasPortfolio hasBought={home.hasBought} />
              <StockList
                title="Stocks you hold"
                stocks={home.heldStocks}
                link={{ route: "holdings", label: "See all →" }}
              />
              <ActivityFeed activity={home.activity} now={now} />
            </>
          )
        }
      >
        {isNew ? (
          <>
            <StartInvesting />
            <StarterPortfolios starters={pickStarters(home.starters, interests)} />
          </>
        ) : (
          <>
            <HomeSummaryLive
              portfolios={home.portfolios}
              addresses={home.addresses}
              benchmarks={home.benchmarks}
              chart={home.chart}
              now={now}
              addFunds={home.addFunds && <AddFundsDialog {...home.addFunds} />}
            />
            <PortfolioPreviewsLive portfolios={home.portfolios} addresses={home.addresses} mode={network.mode} />
            <AttentionList items={home.attention} />
          </>
        )}
      </HomeLayout>
    </div>
  )
}
