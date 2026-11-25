"use client"

import { useState } from "react"
import { PiCoins } from "react-icons/pi"

import { Card } from "@/components/ui/card"
import { InfoTip } from "@/components/ui/info-tip"
import { Slider } from "@/components/ui/slider"
import { type GrowthPoint, startingOn, yearRange } from "@/lib/report/what-if"
import { cn } from "@/lib/utils"

import { Lines } from "./Lines"

const PRESETS = [100, 500, 1000, 5000]

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
    <Card raised className="flex flex-col gap-5 p-5 md:p-6">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="bg-inputBg text-ink-200 flex size-8 flex-none items-center justify-center rounded-lg">
          <PiCoins size={18} aria-hidden />
        </span>
        <h2 className="text-base font-medium tracking-tight">Try it with your own money</h2>
        <InfoTip label="this calculator">
          This takes the test's real results and applies them to the amount you choose, starting from the date you choose. It shows what
          would have happened, not what will.
        </InfoTip>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="what-if-amount" className="text-ink-200 text-[13px] font-medium">
            I put in
          </label>
          <div className="border-hover-border focus-within:border-primary flex h-11 items-center rounded-xl border bg-white px-3.5 transition-colors">
            <input
              id="what-if-amount"
              type="number"
              inputMode="decimal"
              min={1}
              step={50}
              value={amount}
              onChange={(event) => setAmount(Math.max(0, Number(event.target.value)))}
              className="min-w-0 flex-1 bg-transparent text-lg font-medium tabular-nums outline-none"
            />
            <span className="text-ink-400 text-sm">USDC</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  amount === preset ? "border-ink-100 bg-inputBg text-ink-100" : "border-hover-border text-ink-200 hover:bg-inputBg"
                )}
              >
                {preset.toLocaleString("en-US")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-ink-200 flex justify-between text-[13px] font-medium">
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
          <span className="text-ink-400 flex justify-between text-xs tabular-nums">
            <span>{points[0]?.label}</span>
            <span>{points[latest]?.label}</span>
          </span>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-inputBg flex flex-col gap-0.5 rounded-xl px-4 py-3.5">
              <span className="text-ink-200 text-[13px] font-medium">This strategy</span>
              <span className="text-[28px] leading-9 font-semibold tracking-tight tabular-nums">{usdc(result.strategyNow)}</span>
              <span className="text-ink-200 text-xs tabular-nums">
                {gain >= 0 ? "+" : "−"}
                {usdc(Math.abs(gain))} ({signed(result.strategyNow / amount - 1)})
              </span>
            </div>
            <div className="border-hover-border flex flex-col gap-0.5 rounded-xl border px-4 py-3.5">
              <span className="text-ink-200 text-[13px] font-medium">Holding the S&P 500</span>
              <span className="text-ink-200 text-[28px] leading-9 font-semibold tracking-tight tabular-nums">{usdc(result.benchNow)}</span>
              <span className="text-ink-400 text-xs tabular-nums">{ahead ? "behind this strategy" : "ahead of this strategy"}</span>
            </div>
          </div>
          <Lines
            title="Your money over time"
            format="currency"
            height={260}
            series={[
              { name: "This strategy", points: result.line.map(({ label, strategy }) => ({ label, value: strategy })) },
              { name: "S&P 500", points: result.line.map(({ label, bench }) => ({ label, value: bench })) },
            ]}
          />
        </>
      )}

      {range && amount > 0 && (
        <div className="border-border-secondary flex flex-col gap-3 border-t pt-5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[13px] font-medium">How a year went in the test</h3>
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
              <div key={label} className="border-hover-border flex flex-col gap-0.5 rounded-xl border px-3.5 py-3">
                <dt className="text-ink-400 text-xs">{label}</dt>
                <dd className="text-base font-semibold tabular-nums">{usdc(amount * (1 + change))}</dd>
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
