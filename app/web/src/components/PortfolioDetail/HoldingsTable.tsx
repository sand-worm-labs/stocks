"use client"

import { Flash } from "@/components/Markets/Flash"
import { Money } from "@/components/Money/Money"
import { BuyDialog } from "@/components/PortfolioDetail/BuyDialog"
import { SellDialog } from "@/components/PortfolioDetail/SellDialog"
import { useLivePortfolios } from "@/components/Portfolios/useLivePortfolios"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { TradingModeBadge } from "@/components/Trading/TradingModeBadge"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatPercent } from "@/lib/format"
import { portfolioValue } from "@/lib/portfolios/portfolio"
import { changeTone } from "@/lib/tone"
import type { Portfolio } from "@/types/portfolios"
import type { Session } from "@/types/session"

type HoldingsTableProps = {
  portfolio: Portfolio
  cap: number
  addresses: Record<string, string>
  mode: Session["network"]["mode"]
}

export function HoldingsTable({ portfolio, cap, addresses, mode }: HoldingsTableProps) {
  const [live] = useLivePortfolios([portfolio], addresses)
  const { holdings, cash } = live ?? portfolio
  const total = portfolioValue(live ?? portfolio) ?? 1

  return (
    // The shared table draws its own border only in dark mode, so in light this one is given the same
    <div className="border-border-secondary overflow-hidden rounded-xl border dark:border-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>
              Share <span className="font-normal">· cap {formatPercent(cap)}</span>
            </TableHead>
            <TableHead>Bought at</TableHead>
            <TableHead>Price now</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Profit / loss</TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center justify-end gap-2">
                Trade <TradingModeBadge mode={mode} />
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {holdings.map(({ symbol, units, entryPrice, cost, value }) => {
            const weight = value / total
            const gain = value - cost
            const price = value / units
            return (
              <TableRow key={symbol}>
                <TableCell>
                  <span className="flex items-center gap-3 font-medium">
                    <StockAvatar symbol={symbol} className="size-8" />
                    {symbol}
                  </span>
                </TableCell>
                <TableCell className="min-w-48">
                  <ShareBar share={weight} cap={cap} />
                </TableCell>
                <TableCell className="text-ink-400">
                  <Money value={entryPrice} />
                </TableCell>
                <TableCell>
                  <Flash value={price}>
                    <Money value={price} />
                  </Flash>
                </TableCell>
                <TableCell>
                  <Flash value={value}>
                    <Money value={value} />
                  </Flash>
                </TableCell>
                <TableCell className={TONE_TEXT_CLASSNAME[changeTone(gain)]}>
                  <Money value={gain} signed /> · {formatPercent(value / cost - 1, { signed: true })}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    <BuyDialog portfolio={live ?? portfolio} symbol={symbol} cap={cap} mode={mode} />
                    <SellDialog portfolio={live ?? portfolio} symbol={symbol} mode={mode} />
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
          <TableRow>
            <TableCell>
              <span className="flex items-center gap-3 font-medium">
                <StockAvatar symbol="USDC" className="size-8" />
                USDC cash
              </span>
            </TableCell>
            <TableCell>
              <ShareBar share={cash / total} />
            </TableCell>
            <TableCell />
            <TableCell />
            <TableCell>
              <Money value={cash} />
            </TableCell>
            <TableCell />
            <TableCell />
          </TableRow>
        </tbody>
      </Table>
    </div>
  )
}

function ShareBar({ share, cap }: { share: number; cap?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex-1">
        <span className="bg-allocation/20 block h-2 overflow-hidden rounded-full dark:bg-white/20">
          <span
            style={{ width: `${share * 100}%` }}
            className="animate-grow-x bg-allocation block h-full rounded-full"
          />
        </span>
        {cap !== undefined && (
          <span
            aria-hidden="true"
            style={{ left: `${cap * 100}%` }}
            className="bg-ink-100 absolute -top-[3px] h-[14px] w-0.5 rounded-full"
          />
        )}
      </span>
      <span className="w-11 text-right tabular-nums">{formatPercent(share)}</span>
    </div>
  )
}
