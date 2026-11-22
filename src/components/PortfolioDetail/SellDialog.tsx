"use client"

import { useState } from "react"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { ChoiceChips } from "@/components/ui/choice-chips"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DEFAULT_SLIPPAGE, SELL_FRACTIONS, SELL_PRICE_IMPACT } from "@/constants/trade"
import { formatAmount, formatPercent, formatSignedAmount, pluralize } from "@/lib/format"
import { quoteSale } from "@/lib/portfolios/sell"
import type { Portfolio } from "@/lib/portfolios/types"
import { cn } from "@/lib/utils"

type SellDialogProps = {
  portfolio: Portfolio
  // The stock to sell. Without one, everything is sold.
  symbol?: string
  className?: string
}

const TRIGGER_CLASSNAME =
  "border-border-secondary dark:border-border-tertiary hover:bg-hover-bg hover:border-hover-border rounded-lg border px-3 py-1 text-xs font-medium transition-colors"

// The button that opens a sale over the page: one stock, in part or whole, or everything
export function SellDialog({ portfolio, symbol, className }: SellDialogProps) {
  const [open, setOpen] = useState(false)
  const [fraction, setFraction] = useState(1)
  const everything = symbol === undefined
  const symbols = symbol ? [symbol] : portfolio.holdings.map((holding) => holding.symbol)
  const share = everything ? 1 : fraction
  const quote = quoteSale(portfolio, symbols, share)
  if (!quote) return null

  const holding = portfolio.holdings.find((h) => h.symbol === symbol)
  const rows = [
    { label: "Price impact", value: `${(SELL_PRICE_IMPACT * 100).toFixed(2)}%` },
    { label: `At least (${formatPercent(DEFAULT_SLIPPAGE)} slippage)`, value: `${formatAmount(quote.minimum)} USDC` },
    { label: "Swap fee", value: `${formatAmount(quote.fee)} USDC` },
  ]
  const afterwards = quote.remaining
    ? `${pluralize(quote.remaining, "stock")} at about ${formatPercent(quote.restWeight)} each, cash ${formatPercent(quote.cashWeight)}`
    : "everything is cash"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={
          everything
            ? buttonVariants({ intent: "danger", size: "compact", className })
            : cn(TRIGGER_CLASSNAME, className)
        }
      >
        {everything ? "Sell everything" : "Sell"}
      </DialogTrigger>
      <DialogContent aria-label={everything ? "Sell everything" : `Sell ${symbol}`} className="max-w-[480px] gap-4">
        <div className="flex items-center gap-2.5 pr-8">
          <StockAvatar symbol={symbol ?? "$"} className="size-8" />
          <div className="flex flex-col">
            <DialogTitle>{everything ? "Sell everything" : `Sell ${symbol}`}</DialogTitle>
            <DialogDescription>
              {holding
                ? `You hold ${holding.units} · worth ${formatAmount(holding.value)} USDC`
                : `${pluralize(portfolio.holdings.length, "stock")} · worth ${formatAmount(quote.held)} USDC`}
            </DialogDescription>
          </div>
        </div>

        {!everything && (
          <ChoiceChips fill label="How much to sell" choices={SELL_FRACTIONS} value={fraction} onChange={setFraction} />
        )}

        <dl className="flex flex-col gap-1.5 text-[13px]">
          {rows.map(({ label, value }) => (
            <div key={label} className="text-ink-200 flex justify-between gap-3">
              <dt>{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 font-medium">
            <dt>You get</dt>
            <dd className="tabular-nums">{formatAmount(quote.receive)} USDC</dd>
          </div>
        </dl>

        <p className="bg-hover-bg border-hover-border rounded-[10px] border px-3 py-2.5 text-[13px] leading-5 dark:bg-white/5">
          Selling never breaks a rule. Afterwards: {afterwards}. Realised {quote.realised < 0 ? "loss" : "gain"}:{" "}
          {formatSignedAmount(quote.realised)} USDC.
        </p>

        <div className="flex justify-end gap-2">
          <DialogClose className={buttonVariants({ intent: "outline", size: "compact" })}>Cancel</DialogClose>
          <DialogClose
            onClick={() =>
              toast.success(
                everything
                  ? `Sold everything for ${formatAmount(quote.receive)} USDC`
                  : `Sold ${share === 1 ? "all" : formatPercent(share)} of ${symbol} for ${formatAmount(quote.receive)} USDC`,
                { description: "The USDC is back in your portfolio as cash." }
              )
            }
            className={buttonVariants({ intent: everything ? "danger" : "dark", size: "compact" })}
          >
            Sell for {formatAmount(quote.receive)} USDC
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
