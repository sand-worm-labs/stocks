import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { formatAmount, formatPercent, formatSignedAmount } from "@/lib/format"
import type { sellQuote } from "@/lib/portfolios/sell"
import type { Portfolio } from "@/lib/portfolios/types"

type SellSheetProps = { portfolio: Portfolio; quote: NonNullable<ReturnType<typeof sellQuote>> }

// Selling a holding, over the portfolio. Cancel and Sell both go back to it.
export function SellSheet({
  portfolio,
  quote: { holding, fee, receive, minimum, realised, remaining, restWeight, cashWeight },
}: SellSheetProps) {
  const rows = [
    { label: "At least (if the price slips 0.5%)", value: `${formatAmount(minimum)} USDC` },
    { label: "Bid-ask spread, already in the price", value: "about 0.2%" },
    { label: "Swap fee", value: `${formatAmount(fee)} USDC` },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sell ${holding.symbol}`}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="bg-block-surface border-border-secondary dark:border-border-tertiary flex w-full max-w-md flex-col gap-4 rounded-2xl border p-5">
        <div className="flex items-center gap-3">
          <StockAvatar symbol={holding.symbol} className="size-10" />
          <div className="flex flex-col">
            <h2 className="text-lg font-medium">Sell {holding.symbol}</h2>
            <span className="text-ink-400 text-sm">
              You hold {holding.units} · worth {formatAmount(holding.value)} USDC
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {["25%", "50%", "All"].map((choice) => (
            <span
              key={choice}
              className={`rounded-full border px-3 py-1 text-sm ${choice === "All" ? "bg-base-400 text-primary-foreground border-transparent dark:bg-white dark:text-black" : "border-border dark:border-border-tertiary"}`}
            >
              {choice}
            </span>
          ))}
        </div>

        <dl className="flex flex-col gap-2 text-sm">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-ink-400">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
          <div className="border-border-secondary dark:border-border-tertiary flex justify-between gap-3 border-t pt-2 font-medium">
            <dt>You get</dt>
            <dd className="tabular-nums">{formatAmount(receive)} USDC</dd>
          </div>
        </dl>

        <p className="text-ink-400 text-sm">
          Selling never breaks a rule. Afterwards: {remaining} stocks at about{" "}
          {formatPercent(restWeight, { signed: false })} each, cash {formatPercent(cashWeight)}. Realised{" "}
          {realised < 0 ? "loss" : "gain"}: {formatSignedAmount(realised)} USDC.
        </p>

        <div className="flex gap-2">
          <AppLink
            route="portfolio"
            slug={portfolio.id}
            className={buttonVariants({ intent: "outline", size: "compact", className: "flex-1" })}
          >
            Cancel
          </AppLink>
          <AppLink
            route="portfolio"
            slug={portfolio.id}
            className={buttonVariants({ intent: "dark", size: "compact", className: "flex-1" })}
          >
            Sell for {formatAmount(receive)} USDC
          </AppLink>
        </div>
      </div>
    </div>
  )
}
