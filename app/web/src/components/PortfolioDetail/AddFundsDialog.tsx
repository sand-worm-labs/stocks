"use client"

import { useState } from "react"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { AmountField } from "@/components/Money/AmountField"
import { Money } from "@/components/Money/Money"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FancyIcon } from "@/components/ui/fancy-icon"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { DIRECTIONS } from "@/constants/components/portfolio-detail/add-funds-dialog"
import {
  ADD_FUNDS_CHOICES,
  DEFAULT_ADD_FUNDS,
  MIN_BUY_AMOUNT,
  PAPER_DEPOSIT_MAX,
  QUICK_FRACTIONS,
} from "@/constants/trade"
import { formatAmount, formatPercent, pluralize } from "@/lib/format"
import { readAmount } from "@/lib/portfolios/amount"
import { splitDeposit } from "@/lib/portfolios/deposit"
import { cn } from "@/lib/utils"
import type { Portfolio } from "@/types/portfolios"
import type { FundsDirection } from "@/types/ui"

type AddFundsDialogProps = { portfolios: Portfolio[]; cap: number }

export function AddFundsDialog({ portfolios, cap }: AddFundsDialogProps) {
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState<FundsDirection>("add")
  const [text, setText] = useState(DEFAULT_ADD_FUNDS.toFixed(2))
  const [chosen, setChosen] = useState(portfolios[0]?.id)
  const portfolio = portfolios.find(({ id }) => id === chosen) ?? portfolios[0]
  if (!portfolio) return null
  const adding = direction === "add"
  // Only cash can be taken out; the stocks are sold first, on the Sell button, to make more of it
  const max = adding ? PAPER_DEPOSIT_MAX : portfolio.cash
  const reading = readAmount(text, {
    min: MIN_BUY_AMOUNT,
    max,
    under: (least) => `The least is ${least.toFixed(2)} USDC`,
    over: (most) =>
      adding
        ? `The most you can add at once is ${formatAmount(most)} USDC`
        : `Only ${most.toFixed(2)} USDC is in cash. Sell a stock to free up more`,
  })
  const amount = reading.amount ?? 0
  const { buys, invested, cash, fees } = splitDeposit(portfolio, adding ? amount : 0, cap)
  const change = (next: FundsDirection) => {
    setDirection(next)
    setText((next === "add" ? DEFAULT_ADD_FUNDS : Math.min(DEFAULT_ADD_FUNDS, portfolio.cash)).toFixed(2))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setDirection("add")
          setText(DEFAULT_ADD_FUNDS.toFixed(2))
        }
      }}
    >
      <DialogTrigger className={buttonVariants({ intent: "dark", size: "compact" })}>Add funds</DialogTrigger>
      <DialogContent aria-label="Add funds" className="max-w-[480px]">
        <div className="flex items-center gap-3 pr-8">
          <FancyIcon name="funds" size={44} />
          <div className="flex flex-col">
            <DialogTitle>{adding ? "Add funds" : "Remove funds"}</DialogTitle>
            <DialogDescription>
              {adding
                ? "New money is bought into stocks that have room under your rules."
                : "Cash comes out of the strategy and back to your wallet."}
            </DialogDescription>
          </div>
        </div>

        {portfolios.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-ink-400 text-xs font-medium">Add to</span>
            <Select value={portfolio.id} onValueChange={setChosen}>
              <SelectTrigger aria-label="Strategy to add to" className="w-full justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {portfolios.map(({ id, name }) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div
          role="group"
          aria-label="Add or remove"
          className="bg-hover-bg grid grid-cols-2 gap-1 rounded-xl p-1 dark:bg-white/5"
        >
          {DIRECTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={direction === value}
              onClick={() => change(value)}
              className={cn(
                "rounded-lg py-1.5 text-[13px] font-medium transition-colors",
                direction === value ? "bg-ink-100 text-block-surface" : "text-ink-400 hover:text-ink-100"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <AmountField
          id="funds-amount"
          label="Amount"
          text={text}
          onText={setText}
          reading={reading}
          min={MIN_BUY_AMOUNT}
          max={max}
          quick={
            adding
              ? ADD_FUNDS_CHOICES.map(({ value, label }) => ({ label, amount: value }))
              : QUICK_FRACTIONS.map((f) => ({ label: formatPercent(f), amount: portfolio.cash * f }))
          }
          slider={!adding}
          note={
            adding ? undefined : (
              <>
                Cash: <Money value={portfolio.cash} />
              </>
            )
          }
        />

        {adding ? (
          <>
            <div className="flex flex-col gap-1">
              <h4 className="text-ink-400 text-xs font-medium">Where it goes</h4>
              <ul className="text-[13px]">
                {buys.map(({ symbol, spend }) => (
                  <li
                    key={symbol}
                    className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-t py-2 first:border-t-0"
                  >
                    <span className="flex items-center gap-2 text-xs">
                      <StockAvatar symbol={symbol} className="size-5" />
                      {symbol}
                    </span>
                    <Money value={spend} signed className="text-[13px]" />
                  </li>
                ))}
                {cash > 0.005 && (
                  <li className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-t py-2">
                    <span className="flex items-center gap-2 text-xs">
                      <UsdcMark className="size-5" />
                      Stays as cash
                    </span>
                    <Money value={cash} signed className="text-[13px]" />
                  </li>
                )}
              </ul>
            </div>

            <p className="bg-hover-bg border-hover-border rounded-[10px] border px-3 py-2.5 text-[13px] leading-5 dark:bg-white/5">
              {invested > 0
                ? `No stock goes past ${formatPercent(cap)}, and nothing is sold. `
                : `Every stock is at its ${formatPercent(cap)} cap, so all of it stays as cash. `}
              Fees about {formatAmount(fees)} USDC.
            </p>
          </>
        ) : (
          <p className="bg-hover-bg border-hover-border rounded-[10px] border px-3 py-2.5 text-[13px] leading-5 dark:bg-white/5">
            Only cash is taken out, so no stock is sold. Cash left:{" "}
            <Money value={Math.max(portfolio.cash - amount, 0)} />.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <DialogClose className={buttonVariants({ intent: "outline", size: "compact" })}>Cancel</DialogClose>
          <DialogClose
            disabled={reading.amount === undefined}
            onClick={() =>
              toast.success(`${adding ? "Added" : "Removed"} ${formatAmount(amount)} USDC`, {
                description: !adding
                  ? "Sent back to your wallet."
                  : invested > 0
                    ? `Bought ${pluralize(buys.length, "stock")} with it.`
                    : "Kept as cash.",
              })
            }
            className={cn(
              buttonVariants({ intent: "dark", size: "compact" }),
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            {adding ? "Add" : "Remove"} {formatAmount(amount)} USDC
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
