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
import { MIN_BUY_AMOUNT, QUICK_FRACTIONS, SWAP_FEE_RATE } from "@/constants/trade"
import { formatAmount, formatPercent } from "@/lib/format"
import { readAmount } from "@/lib/portfolios/amount"
import { buyRoom, quoteBuy } from "@/lib/portfolios/buy"
import type { Portfolio } from "@/lib/portfolios/types"
import type { Session } from "@/lib/session/types"
import { cn } from "@/lib/utils"

type BuyDialogProps = {
  portfolio: Portfolio
  symbol: string
  // The most of the portfolio one stock may be: the rules' cap
  cap: number
  mode?: Session["network"]["mode"]
  className?: string
}

const TRIGGER_CLASSNAME =
  "border-border-secondary dark:border-border-tertiary hover:bg-hover-bg hover:border-hover-border rounded-lg border px-3 py-1 text-xs font-medium transition-colors"

// Buying more of a stock the portfolio holds, with the cash it has: how much is typed in, up to the cash and no further than
// the stock's cap, which is a rule the agent keeps
export function BuyDialog({ portfolio, symbol, cap, mode, className }: BuyDialogProps) {
  const [open, setOpen] = useState(false)
  const room = buyRoom(portfolio, symbol, cap)
  const [text, setText] = useState(room.toFixed(2))
  const reading = readAmount(text, {
    min: MIN_BUY_AMOUNT,
    max: room,
    under: (least) => `The least you can buy is ${least.toFixed(2)} USDC`,
    over: (most) =>
      most >= portfolio.cash - 0.005
        ? `You only have ${most.toFixed(2)} USDC in cash`
        : `That is past the ${formatPercent(cap)} cap. The most you can add is ${most.toFixed(2)} USDC`,
  })
  const amount = reading.amount ?? 0
  const quote = quoteBuy(portfolio, symbol, amount)
  if (!quote) return null
  const noRoom = room < 0.005

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setText(room.toFixed(2))
      }}
    >
      <DialogTrigger className={cn(TRIGGER_CLASSNAME, className)}>Buy</DialogTrigger>
      <DialogContent aria-label={`Buy ${symbol}`} className="max-w-[480px] gap-4">
        <div className="flex items-center gap-2.5 pr-8">
          <StockAvatar symbol={symbol} className="size-8" />
          <div className="flex flex-col">
            <DialogTitle className="flex items-center gap-2">
              Buy {symbol}
              {mode && <TradingModeBadge mode={mode} long />}
            </DialogTitle>
            <DialogDescription>
              Bought with the portfolio&apos;s cash: <Money value={portfolio.cash} /> available.
            </DialogDescription>
          </div>
        </div>

        {noRoom ? (
          <p className="bg-hover-bg border-hover-border rounded-[10px] border px-3 py-2.5 text-[13px] leading-5 dark:bg-white/5">
            {portfolio.cash < 0.005
              ? "There is no cash to buy with. Add funds first."
              : `${symbol} is already at its ${formatPercent(cap)} cap, so the agent won't buy more.`}
          </p>
        ) : (
          <AmountField
            id={`buy-${symbol}`}
            label="Amount to buy"
            text={text}
            onText={setText}
            reading={reading}
            min={MIN_BUY_AMOUNT}
            max={room}
            quick={QUICK_FRACTIONS.map((f) => ({ label: formatPercent(f), amount: room * f }))}
            slider
            note={`≈ ${quote.units.toFixed(4)} ${symbol}`}
          />
        )}

        <dl className="flex flex-col gap-1.5 text-[13px]">
          <div className="text-ink-200 flex justify-between gap-3">
            <dt>Swap fee ({formatPercent(SWAP_FEE_RATE)})</dt>
            <dd className="tabular-nums">
              <Money value={quote.fee} />
            </dd>
          </div>
          <div className="text-ink-200 flex justify-between gap-3">
            <dt>{symbol} would be</dt>
            <dd className="tabular-nums">{formatPercent(quote.weight)} of the portfolio</dd>
          </div>
          <div className="flex justify-between gap-3 font-medium">
            <dt>Cash after</dt>
            <dd className="tabular-nums">
              <Money value={quote.cashAfter} />
            </dd>
          </div>
        </dl>

        <div className="flex justify-end gap-2">
          <DialogClose className={buttonVariants({ intent: "outline", size: "compact" })}>Cancel</DialogClose>
          <DialogClose
            disabled={noRoom || reading.amount === undefined}
            onClick={() =>
              toast.success(`Bought ${symbol} for ${formatAmount(amount)} USDC`, {
                description: `${quote.units.toFixed(4)} ${symbol} added to the portfolio.`,
              })
            }
            className={cn(
              buttonVariants({ intent: "dark", size: "compact" }),
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            Buy for {formatAmount(amount)} USDC
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
