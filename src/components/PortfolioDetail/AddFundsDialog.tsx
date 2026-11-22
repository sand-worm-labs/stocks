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
import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { ADD_FUNDS_CHOICES, DEFAULT_ADD_FUNDS } from "@/constants/trade"
import { formatAmount, formatPercent, pluralize } from "@/lib/format"
import { splitDeposit } from "@/lib/portfolios/deposit"
import type { Portfolio } from "@/lib/portfolios/types"

type AddFundsDialogProps = { portfolio: Portfolio; cap: number }

// Putting more money in. The agent buys with it where the rules leave room, after you have looked at where it goes.
export function AddFundsDialog({ portfolio, cap }: AddFundsDialogProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState<number>(DEFAULT_ADD_FUNDS)
  const { buys, invested, cash, fees } = splitDeposit(portfolio, amount, cap)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ intent: "dark", size: "compact" })}>Add funds</DialogTrigger>
      <DialogContent aria-label="Add funds" className="max-w-[480px]">
        <div className="flex items-center gap-2.5 pr-8">
          <UsdcMark />
          <div className="flex flex-col">
            <DialogTitle>Add funds</DialogTitle>
            <DialogDescription>New money is bought into stocks that have room under your rules.</DialogDescription>
          </div>
        </div>

        <ChoiceChips fill label="Amount" choices={ADD_FUNDS_CHOICES} value={amount} onChange={setAmount} />

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
                <span className="tabular-nums">+{formatAmount(spend)} USDC</span>
              </li>
            ))}
            {cash > 0.005 && (
              <li className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-t py-2">
                <span className="flex items-center gap-2 text-xs">
                  <UsdcMark className="size-5" />
                  Stays as cash
                </span>
                <span className="tabular-nums">+{formatAmount(cash)} USDC</span>
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

        <div className="flex justify-end gap-2">
          <DialogClose className={buttonVariants({ intent: "outline", size: "compact" })}>Cancel</DialogClose>
          <DialogClose
            onClick={() =>
              toast.success(`Added ${formatAmount(amount)} USDC`, {
                description: invested > 0 ? `Bought ${pluralize(buys.length, "stock")} with it.` : "Kept as cash.",
              })
            }
            className={buttonVariants({ intent: "dark", size: "compact" })}
          >
            Add {formatAmount(amount)} USDC
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
