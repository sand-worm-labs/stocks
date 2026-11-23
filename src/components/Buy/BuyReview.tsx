"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { AmountField } from "@/components/Money/AmountField"
import { VerdictPill } from "@/components/Report/VerdictPill"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Checkbox } from "@/components/ui/checkbox"
import { ChoiceChips } from "@/components/ui/choice-chips"
import { DialogClose, DialogTitle } from "@/components/ui/dialog"
import { routeHref } from "@/config/routes"
import {
  DEFAULT_SLIPPAGE,
  MIN_BUY_AMOUNT,
  NETWORK_FEE,
  QUICK_FRACTIONS,
  SLIPPAGE_CHOICES,
  SWAP_FEE_RATE,
} from "@/constants/trade"
import { formatAmount, formatPercent, pluralize } from "@/lib/format"
import { readAmount } from "@/lib/portfolios/amount"
import type { Order, Report } from "@/lib/report/types"
import type { Session } from "@/lib/session/types"
import { cn } from "@/lib/utils"

export type BuyReviewProps = { orders: Order[]; report: Report; portfolioId: string; network: Session["network"] }

type BuyReviewViewProps = BuyReviewProps & { onBought: () => void }

const CELL = "border-border-secondary dark:border-border-tertiary border-t py-2.5 text-right tabular-nums"

// What buying would do, to read and agree to before it is done
export function BuyReview({ orders: planned, report, portfolioId, network, onBought }: BuyReviewViewProps) {
  const router = useRouter()
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE)
  const [understood, setUnderstood] = useState(true)

  // The plan's spend is the most; a smaller amount buys the same stocks in the same shares, only less of each
  const plan = planned.reduce((sum, order) => sum + order.spend, 0)
  const [text, setText] = useState(plan.toFixed(2))
  const reading = readAmount(text, {
    min: MIN_BUY_AMOUNT,
    max: plan,
    under: (least) => `The least you can buy is ${least.toFixed(2)} USDC`,
    over: (most) => `The plan spends ${most.toFixed(2)} USDC. Edit the rules to spend more`,
  })
  const scale = reading.amount === undefined ? 0 : reading.amount / plan
  const orders = planned.map((order) => ({ ...order, spend: order.spend * scale, receive: order.receive * scale }))
  const spend = reading.amount ?? 0
  const fees = spend * SWAP_FEE_RATE
  const total = spend + fees + NETWORK_FEE
  const { panic, fits } = report.tolerance
  const costs = [
    { label: "Spend", value: `${formatAmount(spend)} USDC` },
    { label: `Swap fees (${formatPercent(SWAP_FEE_RATE)})`, value: `${formatAmount(fees)} USDC` },
    { label: "Bid-ask spread, already in the price", value: "about 0.2%" },
    { label: "Network fee", value: `< ${formatAmount(NETWORK_FEE)} USDC`, className: "text-error" },
  ]

  // Buying ends on the list of portfolios, where this one now shows as live. The toast says it went through, and
  // leads to the portfolio itself.
  const buy = () => {
    const portfolioHref = routeHref("portfolio", undefined, portfolioId)
    onBought()
    toast.success(`Bought ${pluralize(orders.length, "stock")} for ${formatAmount(total)} USDC`, {
      description: `${network.mode === "paper" ? "Paper" : "Live"} · ${network.chain}. Your portfolio is live.`,
      action: portfolioHref ? { label: "View portfolio", onClick: () => router.push(portfolioHref) } : undefined,
    })
    router.push(routeHref("portfolios") ?? "/portfolios")
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 pr-8">
        <DialogTitle>Review</DialogTitle>
        <span className="text-ink-200 font-tertiary flex items-center gap-1.5 text-xs">
          <span aria-hidden="true" className="bg-link size-2 rounded-full" />
          {network.mode === "paper" ? "Paper" : "Live"} · {network.chain}
        </span>
      </div>

      <AmountField
        id="buy-amount"
        label="Amount to invest"
        text={text}
        onText={setText}
        reading={reading}
        min={MIN_BUY_AMOUNT}
        max={plan}
        quick={QUICK_FRACTIONS.map((f) => ({ label: formatPercent(f), amount: plan * f }))}
        slider
        note={`Split across ${pluralize(planned.length, "stock")}`}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] border-collapse text-[13px]">
          <thead>
            <tr className="text-ink-400 text-xs font-medium">
              <th scope="col" className="pb-1.5 text-left font-medium">
                Buy
              </th>
              {["Spend", "You get", "At least", "Price impact"].map((heading) => (
                <th key={heading} scope="col" className="pb-1.5 text-right font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(({ symbol, spend, receive, impact }) => (
              <tr key={symbol}>
                <td className="border-border-secondary dark:border-border-tertiary border-t py-2.5">
                  <span className="flex items-center gap-2 text-xs">
                    <StockAvatar symbol={symbol} className="size-[22px]" />
                    {symbol}
                  </span>
                </td>
                <td className={CELL}>{formatAmount(spend)} USDC</td>
                <td className={CELL}>{receive.toFixed(4)}</td>
                <td className={cn(CELL, "text-ink-200")}>{(receive * (1 - slippage)).toFixed(4)}</td>
                <td className={cn(CELL, "text-emerald-700 dark:text-emerald-400")}>{(impact * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-ink-200 text-[13px]">
          Max slippage <span className="text-ink-400">· cancels if the price moves more</span>
        </span>
        <ChoiceChips
          label="Max slippage"
          choices={SLIPPAGE_CHOICES.map((value) => ({ value, label: formatPercent(value) }))}
          value={slippage}
          onChange={setSlippage}
        />
      </div>

      <dl className="flex flex-col gap-1.5 text-[13px]">
        {costs.map(({ label, value, className }) => (
          <div key={label} className="text-ink-200 flex justify-between gap-3">
            <dt>{label}</dt>
            <dd className={cn("tabular-nums", className)}>{value}</dd>
          </div>
        ))}
        <div className="border-border-secondary dark:border-border-tertiary flex justify-between gap-3 border-t pt-2 font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatAmount(total)} USDC</dd>
        </div>
      </dl>

      <div className="bg-hover-bg border-hover-border flex flex-col gap-2 rounded-xl border p-3.5 dark:bg-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium">Honesty check</span>
          <VerdictPill verdict={report.verdict} plain />
        </div>
        <p className="text-[13px] leading-5">
          Beats holding the S&amp;P 500 in the backtest,{" "}
          {fits ? `fits your ${formatPercent(panic)}, but` : `is past your ${formatPercent(panic)}, and`} most of the
          return is market risk, not skill.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-5">
        <Checkbox
          checked={understood}
          onChange={() => setUnderstood((value) => !value)}
          aria-label="I understand these tokens track the shares' price and carry no voting rights"
          className="mt-0.5"
        />
        I understand these tokens track the shares&apos; price and carry no voting rights.
      </label>

      <div className="flex flex-wrap justify-end gap-2">
        <DialogClose className={buttonVariants({ intent: "outline", size: "compact" })}>Back</DialogClose>
        <button
          type="button"
          disabled={!understood || reading.amount === undefined}
          onClick={buy}
          className={cn(
            buttonVariants({ intent: "dark", size: "compact" }),
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          Buy for {formatAmount(total)} USDC
        </button>
      </div>
    </>
  )
}
