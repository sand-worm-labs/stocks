import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { PiBuildings, PiChartLine, PiCoins, PiDrop, PiFileCode } from "react-icons/pi"
import { SiTradingview } from "react-icons/si"
import { z } from "zod"

import { Address } from "@/components/Address/Address"
import { BackLink } from "@/components/BackLink/BackLink"
import { BaseMark } from "@/components/BaseMark/BaseMark"
import { TokenAvatar } from "@/components/Markets/TokenAvatar"
import { TabSkeleton } from "@/components/Skeleton/TabSkeleton"
import { ExposureCard } from "@/components/Stock/ExposureCard"
import { KnowledgeCard } from "@/components/Stock/KnowledgeCard"
import { RiskCard } from "@/components/Stock/RiskCard"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { ActiveWallets } from "@/components/Token/ActiveWallets"
import { FactList } from "@/components/Token/FactList"
import { TokenAnalytics } from "@/components/Token/TokenAnalytics"
import { TokenChat } from "@/components/Token/TokenChat"
import { TokenFigures } from "@/components/Token/TokenFigures"
import { TokenHeader } from "@/components/Token/TokenHeader"
import { TokenOverview } from "@/components/Token/TokenOverview"
import { TokenPriceCard } from "@/components/Token/TokenPriceCard"
import { TokenTabs } from "@/components/Token/TokenTabs"
import { TokenTrades } from "@/components/Token/TokenTrades"
import { TransfersTable } from "@/components/Token/TransfersTable"
import { FACT_ICON } from "@/constants/markets"
import { DEFAULT_TOKEN_TAB, TOKEN_TABS } from "@/constants/token"
import { getChartSymbol } from "@/lib/markets/chart-symbol"
import { getEthPrice, getTokenContract, getTokenSupply } from "@/lib/markets/onchain"
import { getAllPoolQuotes } from "@/lib/markets/pools"
import { shareTicker } from "@/lib/markets/share"
import { getStockDetail } from "@/lib/markets/source"
import { findToken, getBaseTokens } from "@/lib/markets/tokens"
import { activeWallets, getTransfers } from "@/lib/markets/transfers"
import { exposureTo } from "@/lib/portfolios/portfolio"
import { getPortfolios } from "@/lib/portfolios/source"

type TokenPageProps = {
  params: Promise<{ symbol: string }>
  searchParams: Promise<{ tab?: string }>
}

const link = "text-accent dark:text-primary hover:underline"
const external = { target: "_blank", rel: "noopener noreferrer" } as const

export async function generateMetadata({ params }: TokenPageProps): Promise<Metadata> {
  const { symbol } = await params
  const token = findToken(await getBaseTokens(), decodeURIComponent(symbol))
  return { title: token?.symbol ?? decodeURIComponent(symbol) }
}

export default async function TokenPage({ params, searchParams }: TokenPageProps) {
  const [{ symbol }, { tab: tabParam }] = await Promise.all([params, searchParams])
  const tab = z
    .enum(TOKEN_TABS.map(({ id }) => id) as [string, ...string[]])
    .catch(DEFAULT_TOKEN_TAB)
    .parse(tabParam)
  const tokens = await getBaseTokens()
  const token = findToken(tokens, decodeURIComponent(symbol))
  if (!token) notFound()

  const pools = await getAllPoolQuotes(tokens.map(({ address }) => address))
  const pool = pools.find(({ address }) => address === token.address.toLowerCase())

  return (
    <div className="flex flex-col gap-6">
      <BackLink route="markets" />
      <TokenHeader token={token} />
      <TokenTabs tokenId={token.id} current={tab as (typeof TOKEN_TABS)[number]["id"]} />

      <Suspense key={tab} fallback={<TabSkeleton />}>
        {tab === "overview" && <OverviewTab token={token} />}

        {tab === "stats" && <StatsTab token={token} total={tokens.length} />}

        {tab === "trades" && <TokenTrades address={token.address} symbol={token.symbol} />}

        {tab === "community" && <TokenChat address={token.address} symbol={token.symbol} />}

        {(tab === "holders" || tab === "transfers") && <TransfersTab token={token} view={tab} pair={pool?.pair} />}

        {tab === "info" && <InfoTab token={token} pair={pool?.pair} />}

        {tab === "contract" && <ContractTab token={token} />}

        {tab === "analytics" && <TokenAnalytics token={token} liquidity={pool?.liquidity} />}
      </Suspense>
    </div>
  )
}

type TabProps = { token: NonNullable<ReturnType<typeof findToken>> }

async function OverviewTab({ token }: TabProps) {
  const ticker = shareTicker(token)
  const [portfolios, researched, chartSymbol] = await Promise.all([
    getPortfolios(),
    getStockDetail(token.symbol),
    ticker ? getChartSymbol(ticker) : undefined,
  ])
  const exposures = exposureTo(portfolios, token.symbol)

  return (
    <>
      <TokenPriceCard token={token} chartSymbol={chartSymbol} />
      {(!!exposures.length || researched) && (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {!!exposures.length && <ExposureCard exposures={exposures} />}
          </div>
          <div className="flex flex-col gap-6">
            {!!researched?.detail.knowledge.length && <KnowledgeCard knowledge={researched.detail.knowledge} />}
            {researched?.detail.risk && <RiskCard risk={researched.detail.risk} />}
          </div>
        </div>
      )}
    </>
  )
}

async function StatsTab({ token, total }: TabProps & { total: number }) {
  const [supply, ethUsd] = await Promise.all([getTokenSupply(token.address), getEthPrice()])

  return (
    <>
      <TokenFigures token={token} total={total} />
      <TokenOverview token={token} supply={supply} ethUsd={ethUsd} />
    </>
  )
}

async function TransfersTab({ token, view, pair }: TabProps & { view: "holders" | "transfers"; pair?: string }) {
  const supply = await getTokenSupply(token.address)
  const transfers = await getTransfers(token.address, supply?.decimals ?? 18)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-400 text-sm">
        {view === "transfers"
          ? `The latest transfers of ${token.symbol}, read from Base. These are the last hour.`
          : `The wallets that moved the most ${token.symbol} in the last hour, read from Base. A full count of holders needs an explorer's index.`}
      </p>
      {view === "transfers" ? (
        <TransfersTable transfers={transfers} symbol={token.symbol} />
      ) : (
        <ActiveWallets
          wallets={activeWallets(transfers, [pair ?? "", "0x0000000000000000000000000000000000000000"])}
          symbol={token.symbol}
        />
      )}
    </div>
  )
}

function InfoTab({ token, pair }: TabProps & { pair?: string }) {
  const { id, issuer, company, symbol, address, image } = token
  const ticker = shareTicker(token)

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <FactList
        title="About"
        rows={[
          {
            label: "Token",
            value: symbol,
            icon: <TokenAvatar image={image} symbol={symbol} className="size-5 text-[9px]" />,
          },
          { label: "Issuer", value: issuer, icon: <PiBuildings size={18} className={FACT_ICON} aria-hidden="true" /> },
          {
            label: "Tracks",
            value: ticker ? `${company} (${ticker})` : company,
            icon: <StockAvatar symbol={symbol} className="size-5" />,
          },
          { label: "Chain", value: "Base", icon: <BaseMark size={18} /> },
          {
            label: "Contract",
            value: <Address value={address} kind="token" length="long" />,
            icon: <PiFileCode size={18} className={FACT_ICON} aria-hidden="true" />,
          },
          ...(pair
            ? [
                {
                  label: "Pool",
                  value: <Address value={pair} length="long" href={`https://dexscreener.com/base/${pair}`} />,
                  icon: <PiDrop size={18} className={FACT_ICON} aria-hidden="true" />,
                },
              ]
            : []),
        ]}
      />
      <FactList
        title="Links"
        rows={[
          {
            label: "CoinGecko",
            icon: <PiCoins size={18} className={FACT_ICON} aria-hidden="true" />,
            value: (
              <a href={`https://www.coingecko.com/en/coins/${id}`} {...external} className={link}>
                Open ↗
              </a>
            ),
          },
          {
            label: "BaseScan",
            icon: <BaseMark size={18} />,
            value: (
              <a href={`https://basescan.org/token/${address}`} {...external} className={link}>
                Open ↗
              </a>
            ),
          },
          ...(pair
            ? [
                {
                  label: "Pool chart",
                  icon: <PiChartLine size={18} className={FACT_ICON} aria-hidden="true" />,
                  value: (
                    <a href={`https://dexscreener.com/base/${pair}`} {...external} className={link}>
                      Open ↗
                    </a>
                  ),
                },
              ]
            : []),
          ...(ticker
            ? [
                {
                  label: "Share on TradingView",
                  icon: <SiTradingview size={16} aria-hidden="true" />,
                  value: (
                    <a href={`https://www.tradingview.com/symbols/${ticker}/`} {...external} className={link}>
                      Open ↗
                    </a>
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  )
}

async function ContractTab({ token }: TabProps) {
  const contract = await getTokenContract(token.address)

  return (
    <FactList
      title="Contract"
      rows={[
        {
          label: "Address",
          icon: <PiFileCode size={18} className={FACT_ICON} aria-hidden="true" />,
          value: <Address value={token.address} kind="token" length="full" />,
        },
        { label: "Name", value: contract?.name ?? "—" },
        { label: "Symbol", value: contract?.symbol ?? "—" },
        { label: "Decimals", value: contract?.decimals ?? "—" },
        {
          label: "Total supply",
          value: contract ? contract.totalSupply.toLocaleString("en-US", { maximumFractionDigits: 8 }) : "—",
        },
        {
          label: "Source code",
          icon: <BaseMark size={18} />,
          value: (
            <a href={`https://basescan.org/address/${token.address}#code`} {...external} className={link}>
              View on BaseScan ↗
            </a>
          ),
        },
      ]}
    />
  )
}
