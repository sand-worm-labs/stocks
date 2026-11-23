"use client"

import type { ReactNode } from "react"

import { Slider } from "@/components/ui/slider"
import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import type { AmountReading } from "@/lib/portfolios/amount"
import { cn } from "@/lib/utils"

type AmountFieldProps = {
  id: string
  label: string
  // What is typed, and how to change it
  text: string
  onText: (text: string) => void
  // What it reads as, from `readAmount`
  reading: AmountReading
  min: number
  max: number
  // Amounts to jump to, with Min and Max always there
  quick?: { label: string; amount: number }[]
  // A slider from nothing to the most. Left out where the most is too big to be a useful scale.
  slider?: boolean
  // Something small at the end of the buttons, such as what the amount comes to in units
  note?: ReactNode
}

const BUTTON =
  "border-border-secondary text-ink-200 hover:text-ink-100 hover:bg-hover-bg dark:border-border-tertiary rounded-full border px-3 py-1 text-xs font-medium transition-colors"

// The way to say how much, the same for adding and removing funds, buying and selling: a box to type in, with the coin,
// buttons for the least, the most and amounts between, a slider, and what is wrong in words when it can't be used
export function AmountField({
  id,
  label,
  text,
  onText,
  reading,
  min,
  max,
  quick = [],
  slider,
  note,
}: AmountFieldProps) {
  const set = (amount: number) => onText(Math.min(Math.max(amount, 0), max).toFixed(2))
  const least = Math.min(min, max)
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="text-ink-400 text-xs font-medium">
        {label}
      </label>
      <div
        className={cn(
          "bg-block-surface focus-within:border-mark flex items-center gap-2.5 rounded-xl border px-3 transition-colors",
          reading.error ? "border-red-500" : "border-border-secondary dark:border-border-tertiary"
        )}
      >
        <UsdcMark className="size-5 flex-none" />
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          aria-invalid={Boolean(reading.error)}
          aria-describedby={reading.error ? errorId : undefined}
          onChange={(event) => onText(event.target.value.replace(/[^\d.,]/g, ""))}
          onBlur={() => reading.amount !== undefined && set(reading.amount)}
          className="h-12 min-w-0 flex-1 bg-transparent text-xl tabular-nums outline-none"
        />
        <span className="text-ink-400 text-xs">USDC</span>
        <button
          type="button"
          onClick={() => set(max)}
          className="text-ink-100 hover:bg-hover-bg rounded-md px-2 py-1 text-xs font-medium transition-colors"
        >
          Max
        </button>
      </div>
      {reading.error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {reading.error}
        </p>
      )}
      {slider && (
        <Slider
          aria-label={`${label}, as a share of the most`}
          min={0}
          max={100}
          step={1}
          value={[Math.round(reading.fraction * 100)]}
          onValueChange={([percent]) => set((max * (percent ?? 0)) / 100)}
        />
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => set(least)} className={BUTTON}>
          Min
        </button>
        {quick.map(({ label: name, amount }) => (
          <button key={name} type="button" onClick={() => set(amount)} className={BUTTON}>
            {name}
          </button>
        ))}
        <button type="button" onClick={() => set(max)} className={BUTTON}>
          Max
        </button>
        {note && <span className="text-ink-400 ml-auto text-xs tabular-nums">{note}</span>}
      </div>
    </div>
  )
}
