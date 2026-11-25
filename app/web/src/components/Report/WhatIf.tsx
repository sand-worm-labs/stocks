"use client"

import { useState } from "react"

import { Card } from "@/components/ui/card"
import { InfoTip } from "@/components/ui/info-tip"
import { Slider } from "@/components/ui/slider"
import { type GrowthPoint, startingOn, yearRange } from "@/lib/report/what-if"

import { Lines } from "./Lines"

const usdc = (amount: number) => `${Math.round(amount).toLocaleString("en-US")} USDC`
const signed = (fraction: number) => {
  const rounded = Math.round(fraction * 100)
  return rounded === 0 ? "0%" : `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}%`
}

// "Try it with your own money": a sum and a start date, and what the test says that sum would have become, next to the S&P 500. It is the
// backtest's own line, scaled, and a person can slide the start date to see how much the answer depends on when they got in.
export function WhatIf({
  points,
  amount: suggested,
  year,
}: {
  points: GrowthPoint[]
  amount: number
  // How a year went, as the notebook worked it out; worked out here from the weekly line when it isn't given
  year?: { bad: number; typical: number; good: number }
}) {
  const [amount, setAmount] = useState(suggested > 0 ? suggested : 500)
  const [startAt, setStartAt] = useState(0)
  const latest = Math.max(points.length - 2, 0)

  const result = startingOn(points, amount, Math.min(startAt, latest))
  const range = year ?? yearRange(points)
  const start = points[Math.min(startAt, latest)]
  const gain = result ? result.strategyNow - amount : 0
  const ahead = result ? result.strategyNow >= result.benchNow : true

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-medium">Try it with your own money</h2>
        <InfoTip label="this calculator">
          This takes the test's real results and applies them to the amount you choose, starting from the date you choose. It shows what
          would have happened, not what will.
        </InfoTip>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium">
          <span className="text-ink-200">I put in (USDC)</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            step={50}
            value={amount}
            onChange={(event) => setAmount(Math.max(0, Number(event.target.value)))}
            className="border-border-secondary dark:border-border-tertiary bg-inputBg h-10 rounded-xl border px-3 text-base tabular-nums outline-none focus-visible:ring-2"
          />
        </label>
        <div className="flex flex-col gap-3 text-xs font-medium">
          <span className="text-ink-200 flex justify-between">
            <span>Starting on</span>
            <span className="text-ink-100 tabular-nums">{start?.label}</span>
          </span>
          <Slider
            aria-label="Start date"
            min={0}
            max={latest}
            step={1}
            value={[Math.min(startAt, latest)]}
            onValueChange={([value]) => setStartAt(value ?? 0)}
          />
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-ink-200 text-xs font-medium">This strategy</span>
              <span className="text-[28px] leading-9 font-medium tabular-nums">{usdc(result.strategyNow)}</span>
              <span className="text-ink-400 text-xs tabular-nums">
                {gain >= 0 ? "+" : "−"}
                {usdc(Math.abs(gain))} ({signed(result.strategyNow / amount - 1)})
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-ink-200 text-xs font-medium">Holding the S&P 500</span>
              <span className="text-ink-300 text-[28px] leading-9 font-medium tabular-nums">{usdc(result.benchNow)}</span>
              <span className="text-ink-400 text-xs tabular-nums">{ahead ? "behind this strategy" : "ahead of this strategy"}</span>
            </div>
          </div>
          <Lines
            title="Your money over time"
            format="currency"
            series={[
              { name: "This strategy", points: result.line.map(({ label, strategy }) => ({ label, value: strategy })) },
              { name: "S&P 500", points: result.line.map(({ label, bench }) => ({ label, value: bench })) },
            ]}
          />
        </>
      )}

      {range && amount > 0 && (
        <div className="border-border-secondary dark:border-border-tertiary flex flex-col gap-2 border-t pt-4">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-medium">How a year went in the test</h3>
            <InfoTip label="a year in the test">
              Every 12-month stretch in the test, ranked. A bad year is one that only 1 in 20 stretches fell short of; a good year is
              one that only 1 in 20 beat. It is history, not a forecast, and a worse year than any of these is possible.
            </InfoTip>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            {(
              [
                ["A bad year", range.bad],
                ["A typical year", range.typical],
                ["A good year", range.good],
              ] as const
            ).map(([label, change]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-ink-400 text-xs">{label}</dt>
                <dd className="font-medium tabular-nums">{usdc(amount * (1 + change))}</dd>
                <dd className="text-ink-400 text-xs tabular-nums">{signed(change)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <p className="text-ink-400 text-xs">
        Drawn from {points.length} weekly steps of past prices. Past results don't predict future ones.
      </p>
    </Card>
  )
}
