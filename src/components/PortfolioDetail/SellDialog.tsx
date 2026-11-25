"use client"

import { useState } from "react"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { AmountField } from "@/components/Money/AmountField"
import { Money } from "@/components/Money/Money"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { TradingModeBadge } from "@/components/Trading/TradingModeBadge"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ALL } from "@/constants/components/portfolio-detail/sell-dialog"
import { TRIGGER_CLASSNAME } from "@/constants/components/portfolio-detail/shared"
import { DEFAULT_SLIPPAGE, MIN_SELL_AMOUNT, QUICK_FRACTIONS, SELL_PRICE_IMPACT } from "@/constants/trade"
import { formatAmount, formatPercent, pluralize } from "@/lib/format"
import { readAmount } from "@/lib/portfolios/amount"
import { quoteSale } from "@/lib/portfolios/sell"
import { cn } from "@/lib/utils"
import type { Portfolio } from "@/types/portfolios"
import type { Session } from "@/types/session"

type SellDialogProps = {
  portfolio: Portfolio
  symbol?: string
  pickable?: boolean
  className?: string
  mode?: Session["network"]["mode"]
}

export function SellDialog({ portfolio, symbol: fixed, pickable, className, mode }: SellDialogProps) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(pickable ? portfolio.holdings[0]?.symbol : fixed)
  const symbol = picked
  const everything = symbol === undefined
  const holding = portfolio.holdings.find((h) => h.symbol === symbol)
  const held = holding?.value ?? 0
  // What was typed, so a half-written number is left as it is; the share it makes is read from it
  const [text, setText] = useState(held.toFixed(2))
  const reading = readAmount(text, {
    min: MIN_SELL_AMOUNT,
    max: held,
    under: (least) => `The least you can sell is ${least.toFixed(2)} USDC`,
    over: (most) => `You only hold ${most.toFixed(2)} USDC of it`,
  })
  const share = everything ? 1 : reading.fraction
  const symbols = symbol ? [symbol] : portfolio.holdings.map((h) => h.symbol)
  const quote = quoteSale(portfolio, symbols, share)
  if (!quote) return null

  const rows = [
    { label: "Price impact", value: `${(SELL_PRICE_IMPACT * 100).toFixed(2)}%` },
    { label: `At least (${formatPercent(DEFAULT_SLIPPAGE)} slippage)`, value: <Money value={quote.minimum} /> },
    { label: "Swap fee", value: <Money value={quote.fee} /> },
  ]
  const afterwards = quote.remaining
    ? `${pluralize(quote.remaining, "stock")} at about ${formatPercent(quote.restWeight)} each, cash ${formatPercent(quote.cashWeight)}`
    : "everything is cash"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setText(held.toFixed(2))
      }}
    >
      <DialogTrigger
        className={
          pickable
            ? buttonVariants({ intent: "outline", size: "compact", className })
            : everything
              ? buttonVariants({ intent: "danger", size: "compact", className })
              : cn(TRIGGER_CLASSNAME, className)
        }
      >
        {everything && !pickable ? "Sell everything" : "Sell"}
      </DialogTrigger>
      <DialogContent aria-label={everything ? "Sell everything" : `Sell ${symbol}`} className="max-w-[480px] gap-4">
        <div className="flex items-center gap-2.5 pr-8">
          <StockAvatar symbol={symbol ?? "$"} className="size-8" />
          <div className="flex flex-col">
            <DialogTitle className="flex items-center gap-2">
              {everything ? "Sell everything" : `Sell ${symbol}`}
              {mode && <TradingModeBadge mode={mode} long />}
            </DialogTitle>
            <DialogDescription>
              {holding
                ? `You hold ${holding.units} · worth ${formatAmount(holding.value)} USDC`
                : `${pluralize(portfolio.holdings.length, "stock")} · worth ${formatAmount(quote.held)} USDC`}
            </DialogDescription>
          </div>
        </div>

        {pickable && (
          <div className="flex flex-col gap-1.5">
            <span className="text-ink-400 text-xs font-medium">What to sell</span>
            <Select
              value={picked ?? ALL}
              onValueChange={(next) => {
                const chosen = next === ALL ? undefined : next
                setPicked(chosen)
                setText((portfolio.holdings.find((h) => h.symbol === chosen)?.value ?? 0).toFixed(2))
              }}
            >
              <SelectTrigger aria-label="What to sell" className="w-full justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {portfolio.holdings.map(({ symbol: name }) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
                <SelectItem value={ALL}>Everything</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {!everything && holding && (
          <AmountField
            id={`sell-${symbol}`}
            label="Amount to sell"
            text={text}
            onText={setText}
            reading={reading}
            min={MIN_SELL_AMOUNT}
            max={held}
            quick={QUICK_FRACTIONS.map((f) => ({ label: formatPercent(f), amount: held * f }))}
            slider
            note={`≈ ${(holding.units * share).toFixed(4)} ${symbol}`}
          />
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
            <dd className="tabular-nums">
              <Money value={quote.receive} />
            </dd>
          </div>
        </dl>

        <p className="bg-hover-bg border-hover-border rounded-[10px] border px-3 py-2.5 text-[13px] leading-5 dark:bg-white/5">
          Selling never breaks a rule. Afterwards: {afterwards}. Realised {quote.realised < 0 ? "loss" : "gain"}:{" "}
          <Money value={quote.realised} signed className="font-medium" />.
        </p>

        <div className="flex justify-end gap-2">
          <DialogClose className={buttonVariants({ intent: "outline", size: "compact" })}>Cancel</DialogClose>
          <DialogClose
            disabled={!everything && reading.amount === undefined}
            onClick={() =>
              toast.success(
                everything
                  ? `Sold everything for ${formatAmount(quote.receive)} USDC`
                  : `Sold ${share === 1 ? "all" : formatPercent(share)} of ${symbol} for ${formatAmount(quote.receive)} USDC`,
                { description: "The USDC is back in your strategy as cash." }
              )
            }
            className={cn(
              buttonVariants({ intent: everything ? "danger" : "dark", size: "compact" }),
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            Sell for {formatAmount(quote.receive)} USDC
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
