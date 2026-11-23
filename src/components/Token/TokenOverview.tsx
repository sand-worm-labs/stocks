"use client"

import type { ReactNode } from "react"

import { Flash } from "@/components/Markets/Flash"
import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { Money } from "@/components/Money/Money"
import { Card } from "@/components/ui/card"
import { formatPercent, shortenAddress } from "@/lib/format"
import type { TokenSupply } from "@/lib/markets/onchain"
import { shareTicker } from "@/lib/markets/share"
import type { BaseToken } from "@/lib/markets/tokens"

type TokenOverviewProps = { token: BaseToken; supply?: TokenSupply; ethUsd?: number }

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-ink-400 text-xs font-medium tracking-wide uppercase">{title}</h2>
      <dl className="flex flex-col gap-4">{children}</dl>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-ink-400 text-sm">{label}</dt>
      <dd className="text-sm font-medium break-words">{children}</dd>
    </div>
  )
}

const link = "text-accent dark:text-primary hover:underline"

// What a token's page on a block explorer shows: what exists of it, what it is worth, and where it lives
export function TokenOverview({ token, supply, ethUsd }: TokenOverviewProps) {
  const { address, symbol, issuer, company, id, marketCap, change24h } = token
  const pool = useLiveMarketContext().quotes[address.toLowerCase()]
  const price = pool?.price ?? token.price
  const change = pool?.change24h === undefined ? change24h : pool.change24h / 100
  const ticker = shareTicker(token)

  return (
    <Card className="grid gap-8 p-4 md:p-6 lg:grid-cols-3">
      <Section title="Overview">
        {supply && (
          <Row label="Max total supply">
            {supply.totalSupply.toLocaleString("en-US", { maximumFractionDigits: 4 })} {symbol}
          </Row>
        )}
        <Row label="Issuer">{issuer}</Row>
        <Row label="Tracks">{ticker ? `${company} (${ticker})` : company}</Row>
        <Row label="Chain">Base</Row>
      </Section>

      <Section title="Market">
        <Row label="Price">
          <Flash value={price}>
            <Money value={price} />
          </Flash>
          {ethUsd && (
            <span className="text-ink-400 font-normal tabular-nums"> @ {(price / ethUsd).toFixed(6)} ETH</span>
          )}
          {change !== undefined && (
            <span className={change < 0 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
              {" "}
              ({formatPercent(change, { signed: true })})
            </span>
          )}
        </Row>
        {supply && (
          <Row label="Onchain market cap">
            <Flash value={supply.totalSupply * price}>
              <Money value={supply.totalSupply * price} />
            </Flash>
          </Row>
        )}
        {marketCap !== undefined && (
          <Row label="Circulating supply market cap">
            <Money value={marketCap} />{" "}
            <span className="text-ink-400 font-normal">
              (<Money value={marketCap} compact />)
            </span>
          </Row>
        )}
      </Section>

      <Section title="Other info">
        <Row label={supply ? `Token contract (with ${supply.decimals} decimals)` : "Token contract"}>
          <a
            href={`https://basescan.org/token/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            title={address}
            className={`${link} font-body-mono`}
          >
            {shortenAddress(address)}
          </a>
        </Row>
        <Row label="Pool">
          {pool ? (
            <a
              href={`https://dexscreener.com/base/${pool.pair}`}
              target="_blank"
              rel="noopener noreferrer"
              className={link}
            >
              {shortenAddress(pool.pair)} ↗
            </a>
          ) : (
            "—"
          )}
        </Row>
        <Row label="Listed on">
          <a
            href={`https://www.coingecko.com/en/coins/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={link}
          >
            CoinGecko ↗
          </a>
        </Row>
      </Section>
    </Card>
  )
}
