import { PiArrowRight } from "react-icons/pi"

import { Address } from "@/components/Address/Address"
import { AppLink } from "@/components/AppLink/AppLink"
import { BaseMark } from "@/components/BaseMark/BaseMark"
import { buttonVariants } from "@/components/Button/Button"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { CardRow } from "@/components/ui/card"
import { IconTile } from "@/components/ui/icon-tile"
import { Tag } from "@/components/ui/tag"
import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { ACTIVITY_KIND, explorerTxUrl } from "@/constants/activity"
import { formatTime } from "@/lib/dates"
import { formatAmount } from "@/lib/format"
import type { Activity, TradeReceipt } from "@/types/activity"

import { NotificationActions, NotificationDot } from "./NotificationMark"

type ActivityRowProps = {
  activity: Activity
  portfolioName?: string
}

function Receipt({ trade }: { trade: TradeReceipt }) {
  const { symbol, side, spend, units, price, fee, impact, tx } = trade
  const facts = [
    { label: "Price", value: `${formatAmount(price)} USDC` },
    { label: "Fee", value: `${formatAmount(fee)} USDC` },
    { label: "Price impact", value: `${(impact * 100).toFixed(2)}%` },
  ]

  return (
    <div className="bg-hover-bg border-hover-border flex flex-col gap-2 rounded-xl border p-3 text-[13px] dark:bg-white/5">
      <div className="flex flex-wrap items-center gap-2 font-medium">
        <span className="flex items-center gap-1.5">
          {side === "buy" ? <UsdcMark className="size-5" /> : <StockAvatar symbol={symbol} className="size-5" />}
          <span className="tabular-nums">
            {side === "buy" ? formatAmount(spend) : units} {side === "buy" ? "USDC" : symbol}
          </span>
        </span>
        <PiArrowRight aria-hidden="true" className="text-ink-400" size={14} />
        <span className="flex items-center gap-1.5">
          {side === "buy" ? <StockAvatar symbol={symbol} className="size-5" /> : <UsdcMark className="size-5" />}
          <span className="tabular-nums">
            {side === "buy" ? units : formatAmount(spend)} {side === "buy" ? symbol : "USDC"}
          </span>
        </span>
      </div>
      <dl className="text-ink-400 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {facts.map(({ label, value }) => (
          <div key={label} className="flex gap-1.5">
            <dt>{label}</dt>
            <dd className="text-ink-100 tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="flex gap-1.5">
          <dt>Receipt</dt>
          <dd>
            {tx ? <Address value={tx} kind="tx" href={explorerTxUrl(tx)} icon={<BaseMark size={12} />} /> : "Paper trade, no transaction"}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function ActivityRow({ activity, portfolioName }: ActivityRowProps) {
  const { kind, title, detail, at, action, rule, request, trade, checks } = activity
  const { icon, category } = ACTIVITY_KIND[kind]
  const isNotification = category === "alerts"

  return (
    <CardRow className="flex gap-3 p-4">
      {trade ? <StockAvatar symbol={trade.symbol} className="size-10" /> : <IconTile icon={icon} />}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {title}
              {isNotification && <NotificationDot id={activity.id} />}
              {portfolioName && <Tag>{portfolioName}</Tag>}
              {rule && <Tag dot="negative">§ {rule}</Tag>}
              {checks && (
                <Tag dot={checks.passing === checks.total ? "positive" : "negative"}>
                  {checks.passing}/{checks.total} hold
                </Tag>
              )}
            </span>
            <span className="text-ink-400 text-sm">{detail}</span>
          </div>
          <time dateTime={at} className="text-ink-400 flex-none pt-0.5 text-xs tabular-nums">
            {formatTime(at)}
          </time>
        </div>
        {request && (
          <blockquote className="border-border-secondary dark:border-border-tertiary border-l-2 pl-3 text-sm italic">
            “{request}”
          </blockquote>
        )}
        {trade && <Receipt trade={trade} />}
        {(action || isNotification) && (
          <div className="flex flex-wrap gap-2">
            {action && (
              <AppLink
                route={action.route}
                slug={action.slug}
                className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-8 min-w-0 px-3 text-xs" })}
              >
                {action.label}
              </AppLink>
            )}
            {isNotification && <NotificationActions id={activity.id} />}
          </div>
        )}
      </div>
    </CardRow>
  )
}
