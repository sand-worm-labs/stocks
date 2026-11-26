"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { PiCircleNotch } from "react-icons/pi"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { AmountField } from "@/components/Money/AmountField"
import { VerdictPill } from "@/components/Report/VerdictPill"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Checkbox } from "@/components/ui/checkbox"
import { ChoiceChips } from "@/components/ui/choice-chips"
import { DialogClose, DialogTitle } from "@/components/ui/dialog"
import { UsdcBalance } from "@/components/Wallet/UsdcBalance"
import { useWalletUsdc } from "@/components/Wallet/useWalletUsdc"
import { useWallet } from "@/components/Wallet/WalletContext"
import { routeHref } from "@/config/routes"
import { CELL, FAUCET_URL, STEP_TEXT } from "@/constants/components/buy/buy-review"
import {
  DEFAULT_SLIPPAGE,
  MIN_BUY_AMOUNT,
  QUICK_FRACTIONS,
  SLIPPAGE_CHOICES,
  SWAP_FEE_RATE,
  TRADE_CHAIN,
} from "@/constants/trade"
import { formatAmount, formatPercent, pluralize } from "@/lib/format"
import { readAmount } from "@/lib/portfolios/amount"
import type { ResearchResult } from "@/lib/research/result"
import { errorMessage, tradeStrategy } from "@/lib/strategies/client"
import { APPROVAL_WINDOW_MS, approvalMessage } from "@/lib/trade/authorize"
import { withFee } from "@/lib/trade/fee"
import { cn } from "@/lib/utils"
import type { Order, Report } from "@/types/report"
import type { Session } from "@/types/session"
import type { BuyStep } from "@/types/ui"

export type BuyReviewProps = {
  orders: Order[]
  report: Report
  portfolioId: string
  network: Session["network"]
  // One of the made-up strategies: there is nothing to pay for, so buying only shows how it would go
  demo?: boolean
  // What real research found, when it has: the honesty check then says that, instead of the template's
  research?: Pick<ResearchResult, "verdict" | "checks">
}

type BuyReviewViewProps = BuyReviewProps & { onBought: () => void }

export function BuyReview({ orders: planned, report, portfolioId, network, demo, research, onBought }: BuyReviewViewProps) {
  const router = useRouter()
  const wallet = useWallet()
  const { connected, chain, reading: walletReading, isWaiting } = useWalletUsdc()
  const [step, setStep] = useState<BuyStep>("idle")
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE)
  const [understood, setUnderstood] = useState(true)

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
  const total = withFee(spend)
  const fees = total - spend
  const withWallet = !demo && network.mode === "live"
  const onTradeChain = chain?.id === TRADE_CHAIN.id
  const balance = typeof walletReading === "object" ? walletReading.balance : undefined
  const short = withWallet && onTradeChain && balance !== undefined && balance < total
  const busy = step !== "idle"
  const { panic, fits } = report.tolerance
  const costs = [
    { label: "Spend", value: `${formatAmount(spend)} USDC` },
    { label: `Swap fees (${formatPercent(SWAP_FEE_RATE)})`, value: `${formatAmount(fees)} USDC` },
    { label: "Bid-ask spread, already in the price", value: "about 0.2%" },
    {
      label: "Network fee",
      value: withWallet ? "about a cent, paid in ETH" : "none while paper trading",
    },
  ]

  const portfolioHref = routeHref("portfolio", undefined, portfolioId)
  const done = (how: string) => {
    onBought()
    toast.success(`Your strategy is live with ${pluralize(orders.length, "stock")}`, {
      description: `${how} · ${network.chain}`,
      action: portfolioHref ? { label: "View strategy", onClick: () => router.push(portfolioHref) } : undefined,
    })
    router.push(portfolioHref ?? "/strategies")
    router.refresh()
  }

  const buy = async () => {
    if (busy) return
    if (demo) {
      onBought()
      toast.success(`Bought ${pluralize(orders.length, "stock")} for ${formatAmount(total)} USDC`, {
        description: `Demo strategy · ${network.chain}`,
      })
      return router.push(routeHref("portfolios") ?? "/strategies")
    }

    try {
      if (!withWallet) {
        setStep("checking")
        await tradeStrategy(portfolioId, { mode: "paper", amount: spend })
        return done("Paper trading")
      }

      if (!onTradeChain) {
        setStep("switching")
        await wallet.approve.switchChain(TRADE_CHAIN.id)
      }
      setStep("signing")
      const expires = new Date(Date.now() + APPROVAL_WINDOW_MS / 1.5).toISOString()
      const { address, signature } = await wallet.approve.sign(
        approvalMessage({ strategyId: portfolioId, address: wallet.address as `0x${string}`, limit: total, expires })
      )
      setStep("checking")
      await tradeStrategy(portfolioId, { mode: "live", amount: spend, address, expires, signature })
      done("Approved with your wallet")
    } catch (error) {
      toast.error("Couldn't start the strategy", { description: errorMessage(error) })
    } finally {
      setStep("idle")
    }
  }

  const action = (() => {
    if (busy) return { label: STEP_TEXT[step as Exclude<BuyStep, "idle">], disabled: true, spin: true }
    if (!withWallet)
      return { label: `Buy for ${formatAmount(total)} USDC`, disabled: !understood || reading.amount === undefined }
    if (isWaiting) return { label: "Checking your wallet…", disabled: true }
    if (!connected) return { label: "Connect your wallet", disabled: false, run: () => wallet.openSignIn() }
    if (!onTradeChain) return { label: `Switch to ${TRADE_CHAIN.name}`, disabled: false, run: buy }
    if (short) return { label: "Not enough USDC", disabled: true }
    return { label: "Approve with your wallet", disabled: !understood || reading.amount === undefined }
  })()

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

      {withWallet && (
        <p className="text-ink-200 -mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px]">
          <span className={cn(short && "text-error")}>
            Your wallet: <UsdcBalance />
          </span>
          <a
            href={FAUCET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent dark:text-primary hover:underline"
          >
            Get test USDC
          </a>
        </p>
      )}

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
        {costs.map(({ label, value }) => (
          <div key={label} className="text-ink-200 flex justify-between gap-3">
            <dt>{label}</dt>
            <dd className="tabular-nums">{value}</dd>
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
          {research?.verdict ? (
            <span className="text-[13px]">{research.verdict.label}</span>
          ) : (
            <VerdictPill verdict={report.verdict} plain />
          )}
        </div>
        {research ? (
          <ul className="flex flex-col gap-1.5 text-[13px] leading-5">
            {research.checks
              .filter(({ tone }) => tone !== "good")
              .slice(0, 3)
              .map(({ text }) => (
                <li key={text}>{text}</li>
              ))}
          </ul>
        ) : report.preview ? (
          <p className="text-[13px] leading-5">
            The research agent isn&apos;t connected yet, so these results are an example and there is no honesty check
            to show.
            {withWallet
              ? ` This is ${network.chain}, with test USDC that has no real value. This records your approval; trades from your wallet on the chain come next.`
              : " Paper trading uses no money."}
          </p>
        ) : (
          <p className="text-[13px] leading-5">
            Beats holding the S&amp;P 500 in the backtest,{" "}
            {fits ? `fits your ${formatPercent(panic)}, but` : `is past your ${formatPercent(panic)}, and`} most of the
            return is market risk, not skill.
          </p>
        )}
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
          disabled={action.disabled}
          aria-busy={busy}
          onClick={"run" in action && action.run ? action.run : buy}
          className={cn(
            buttonVariants({ intent: "dark", size: "compact" }),
            "gap-2 disabled:cursor-not-allowed disabled:opacity-50",
            busy && "disabled:cursor-wait disabled:opacity-80"
          )}
        >
          {"spin" in action && action.spin && <PiCircleNotch aria-hidden="true" className="animate-spin" />}
          {action.label}
        </button>
      </div>
    </>
  )
}
