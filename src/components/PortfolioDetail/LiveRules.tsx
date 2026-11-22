import { PiCheck, PiLockKey, PiX } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { Card } from "@/components/ui/card"
import { TONE_TILE_CLASSNAME } from "@/constants/tone"
import type { Activity } from "@/lib/activity/types"
import { formatActivityTime, formatDay, formatTime } from "@/lib/dates"
import type { Portfolio } from "@/lib/portfolios/types"
import type { RuleReading } from "@/lib/rules/readings"
import type { StrategyRow } from "@/lib/rules/types"
import { cn } from "@/lib/utils"

type LiveRulesProps = {
  portfolio: Portfolio
  readings: RuleReading[]
  strategy: StrategyRow[]
  checks: Activity[]
  now: string
}

// A rule this close to its line is drawn as the one to watch
const WATCH = 0.85

function Headroom({ closeness }: { closeness: number }) {
  return (
    <span className="bg-hover-bg h-1.5 flex-1 overflow-hidden rounded-full dark:bg-white/10">
      <span
        style={{ width: `${Math.min(closeness, 1) * 100}%` }}
        className={cn(
          "animate-grow-x block h-full rounded-full",
          closeness >= 1 ? "bg-red-600" : closeness >= WATCH ? "bg-amber-500" : "bg-emerald-600"
        )}
      />
    </span>
  )
}

// The rules a live portfolio is held to: each with how much room it has, when it was last checked, and how to change it
export function LiveRules({ portfolio, readings, strategy, checks, now }: LiveRulesProps) {
  const { rules, startedAt, id } = portfolio

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn("flex size-10 flex-none items-center justify-center rounded-lg", TONE_TILE_CLASSNAME.neutral)}
          >
            <PiLockKey size={20} />
          </span>
          <div className="flex flex-col">
            <span className="font-medium">
              {rules ? `${rules.passing} of ${rules.total} rules hold` : "Rules locked"}
            </span>
            <span className="text-ink-400 text-sm">
              Locked {startedAt && formatDay(startedAt)} · last checked{" "}
              {rules && `today ${formatTime(rules.checkedAt)}`}. Every trade is checked against them first.
            </span>
          </div>
        </div>
        <AppLink route="adapt" slug={id} className={buttonVariants({ intent: "outline", size: "compact" })}>
          Change rules
        </AppLink>
      </Card>

      <Card className="rounded-[14px] px-4 py-2 md:px-6">
        <ul>
          {readings.map(({ rule, reading, closeness }, i) => (
            <li
              key={rule.id}
              style={{ "--index": i } as React.CSSProperties}
              className="animate-fade-up border-border-secondary dark:border-border-tertiary flex flex-col gap-2 border-t py-4 first:border-t-0"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 flex-none items-center justify-center rounded-full",
                    rule.state === "holds" ? TONE_TILE_CLASSNAME.positive : TONE_TILE_CLASSNAME.negative
                  )}
                >
                  {rule.state === "holds" ? <PiCheck size={13} /> : <PiX size={13} />}
                </span>
                <span className="text-ink-400 w-3 text-xs tabular-nums">{rule.id}</span>
                <span className="flex-1 font-medium">{rule.label}</span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    rule.state === "holds" ? "text-emerald-700 dark:text-emerald-400" : "text-error"
                  )}
                >
                  {rule.state === "holds" ? "Holds" : "Broken"}
                </span>
              </div>
              <div className="flex items-center gap-3 pl-[52px]">
                {closeness !== undefined && <Headroom closeness={closeness} />}
                <span className="text-ink-400 text-[13px]">{reading}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2 rounded-[14px] p-4 md:px-6 md:py-5">
          <h3 className="text-[17px] font-medium">Strategy</h3>
          <dl>
            {strategy.map(({ label, value }) => (
              <div
                key={label}
                className="border-border-secondary dark:border-border-tertiary flex justify-between gap-3 border-t py-2 text-[13px] first:border-t-0"
              >
                <dt className="text-ink-200">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="flex flex-col gap-2 rounded-[14px] p-4 md:px-6 md:py-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[17px] font-medium">Recent checks</h3>
            <AppLink
              route="portfolioActivity"
              slug={id}
              query={{ filter: "agent" }}
              className="text-accent dark:text-primary text-xs hover:underline"
            >
              All checks
            </AppLink>
          </div>
          <ul>
            {checks.map(({ id: checkId, title, detail, at }) => (
              <li
                key={checkId}
                className="border-border-secondary dark:border-border-tertiary flex flex-col gap-0.5 border-t py-2 text-[13px] first:border-t-0"
              >
                <span className="flex justify-between gap-3">
                  <span className="font-medium">{title}</span>
                  <span className="text-ink-400 text-xs">{formatActivityTime(at, now)}</span>
                </span>
                <span className="text-ink-400 text-xs">{detail}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
