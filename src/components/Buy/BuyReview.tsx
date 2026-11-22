import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DEFAULT_SLIPPAGE, NETWORK_FEE, SLIPPAGE_CHOICES, SWAP_FEE_RATE } from "@/constants/trade"
import { formatAmount, formatPercent } from "@/lib/format"
import type { Order, Report } from "@/lib/report/types"
import type { Session } from "@/lib/session/types"
import { cn } from "@/lib/utils"

type BuyReviewProps = { orders: Order[]; report: Report; portfolioId: string; network: Session["network"] }

export function BuyReview({ orders, report, portfolioId, network }: BuyReviewProps) {
  const spend = orders.reduce((sum, order) => sum + order.spend, 0)
  const fees = spend * SWAP_FEE_RATE
  const total = spend + fees + NETWORK_FEE
  const costs = [
    { label: "Spend", value: `${formatAmount(spend)} USDC` },
    { label: `Swap fees (${formatPercent(SWAP_FEE_RATE)})`, value: `${formatAmount(fees)} USDC` },
    { label: "Bid-ask spread, already in the price", value: "about 0.2%" },
    { label: "Network fee", value: `< ${formatAmount(NETWORK_FEE)} USDC` },
  ]

  return (
    <Card className="flex flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Review and buy · version {report.version}</h2>
        <Badge tone="info">
          {network.mode === "paper" ? "Paper" : "Live"} · {network.chain}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Buy</TableHead>
            <TableHead>Spend</TableHead>
            <TableHead>You get</TableHead>
            <TableHead className="hidden sm:table-cell">At least</TableHead>
            <TableHead className="hidden sm:table-cell">Moves price by</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {orders.map(({ symbol, spend, receive, minimum, impact }) => (
            <TableRow key={symbol}>
              <TableCell>
                <span className="flex items-center gap-2 font-medium">
                  <StockAvatar symbol={symbol} className="size-6" />
                  {symbol}
                </span>
              </TableCell>
              <TableCell className="tabular-nums">{spend} USDC</TableCell>
              <TableCell className="tabular-nums">{receive}</TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">{minimum}</TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">{formatPercent(impact)}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">Price can move by up to · or the trade cancels</span>
        <div className="flex gap-2">
          {SLIPPAGE_CHOICES.map((choice) => (
            <span
              key={choice}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                choice === DEFAULT_SLIPPAGE
                  ? "bg-base-400 text-primary-foreground border-transparent dark:bg-white dark:text-black"
                  : "border-border dark:border-border-tertiary"
              )}
            >
              {formatPercent(choice)}
            </span>
          ))}
        </div>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        {costs.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-ink-400">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="border-border-secondary dark:border-border-tertiary flex justify-between gap-3 border-t pt-2 font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatAmount(total)} USDC</dd>
        </div>
      </dl>

      <div className="bg-inputBg flex flex-col gap-1 rounded-xl p-4 text-sm dark:bg-white/5">
        <span className="font-medium">Honesty check · {report.verdict.label}</span>
        <span className="text-ink-400">
          Beats holding the S&amp;P 500 in the backtest, fits your −20%, but most of the return is market risk, not
          skill.
        </span>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" defaultChecked className="accent-primary mt-0.5 size-4" />I understand these tokens track
        the shares&apos; price and carry no voting rights.
      </label>

      <div className="flex flex-wrap gap-2">
        <AppLink route="adapt" slug={portfolioId} className={buttonVariants({ intent: "outline", size: "compact" })}>
          Back
        </AppLink>
        <AppLink route="portfolio" slug={portfolioId} className={buttonVariants({ intent: "dark", size: "compact" })}>
          Buy for {formatAmount(total)} USDC
        </AppLink>
      </div>
    </Card>
  )
}
