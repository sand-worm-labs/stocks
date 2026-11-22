import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPercent, formatUsd } from "@/lib/format"
import type { Report } from "@/lib/report/types"

import { ReportSection } from "../ReportSection"

export function LiquiditySection({ liquidity }: { liquidity: Report["liquidity"] }) {
  return (
    <ReportSection title="Can you actually trade it?" term="Liquidity">
      <p className="text-sm">
        Yes. All four have more than $100K of liquidity on Base, and tokens track their shares within 0.3%.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Token price</TableHead>
            <TableHead>Share price</TableHead>
            <TableHead>Gap</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {liquidity.map(({ symbol, token, share }) => (
            <TableRow key={symbol}>
              <TableCell>
                <span className="flex items-center gap-2 font-medium">
                  <StockAvatar symbol={symbol} className="size-6" />
                  {symbol}
                </span>
              </TableCell>
              <TableCell className="tabular-nums">{formatUsd(token)}</TableCell>
              <TableCell className="tabular-nums">{formatUsd(share)}</TableCell>
              <TableCell className="tabular-nums">{formatPercent(token / share - 1, { signed: true })}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
      <p className="text-ink-400 text-xs">
        On weekends the token can drift from the share price. The agent won&apos;t buy if the gap is over 1%.
      </p>
    </ReportSection>
  )
}
