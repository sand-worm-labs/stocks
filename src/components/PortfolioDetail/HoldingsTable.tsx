import { AppLink } from "@/components/AppLink/AppLink"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatAmount, formatPercent, formatSignedAmount } from "@/lib/format"
import type { Portfolio } from "@/lib/portfolios/types"
import { changeTone } from "@/lib/tone"

export function HoldingsTable({ portfolio: { id, holdings, cash } }: { portfolio: Portfolio }) {
  return (
    <Card className="flex flex-col gap-2 pt-4">
      <div className="px-4 md:px-6">
        <span className="text-ink-400 text-sm">Holdings</span>
        <h3 className="text-lg font-medium">Tesla is the only one down.</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Profit / loss</TableHead>
            <TableHead>
              <span className="sr-only">Sell</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {holdings.map(({ symbol, cost, value }) => (
            <TableRow key={symbol}>
              <TableCell>
                <span className="flex items-center gap-2 font-medium">
                  <StockAvatar symbol={symbol} className="size-6" />
                  {symbol}
                </span>
              </TableCell>
              <TableCell className="tabular-nums">{formatAmount(cost)}</TableCell>
              <TableCell className="tabular-nums">{formatAmount(value)}</TableCell>
              <TableCell className={`${TONE_TEXT_CLASSNAME[changeTone(value - cost)]} tabular-nums`}>
                {formatSignedAmount(value - cost)} · {formatPercent(value / cost - 1, { signed: true })}
              </TableCell>
              <TableCell className="text-right">
                <AppLink
                  route="portfolio"
                  slug={id}
                  query={{ sell: symbol }}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  Sell
                </AppLink>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell>
              <span className="flex items-center gap-2 font-medium">
                <StockAvatar symbol="$" className="size-6" />
                USDC cash
              </span>
            </TableCell>
            <TableCell className="tabular-nums">{formatAmount(cash)}</TableCell>
            <TableCell className="tabular-nums">{formatAmount(cash)}</TableCell>
            <TableCell />
            <TableCell />
          </TableRow>
        </tbody>
      </Table>
    </Card>
  )
}
