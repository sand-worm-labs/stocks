"use client"

import { type ReactNode, useState } from "react"

import { Card } from "@/components/ui/card"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Slider } from "@/components/ui/slider"
import { BRIEF_BUDGETS, BRIEF_GOALS, BRIEF_HORIZONS, CUSTOM_BUDGET, MAX_LOSS } from "@/constants/brief"
import type { BriefChange, BriefFields } from "@/lib/brief/types"

import { ChipInput } from "./ChipInput"

const asOptions = <T extends string>(values: readonly T[]) => values.map((value) => ({ value, label: value }))

const BUDGET_OPTIONS = [
  ...BRIEF_BUDGETS.map((value) => ({ value: String(value), label: value.toLocaleString("en-US") })),
  { value: CUSTOM_BUDGET, label: "Custom" },
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-ink-400 text-xs font-medium">{label}</span>
      {children}
    </div>
  )
}

type BriefControlsProps = {
  // What the brief says right now. The controls show it, and never hold a copy of their own.
  fields: BriefFields
  onChange: (change: BriefChange) => void
}

// What the agent read in the brief, as choices to change. A change is written back into the brief, so the words and
// the controls can't disagree.
export function BriefControls({
  fields: { goal, horizon, loss, budget, include, avoid },
  onChange,
}: BriefControlsProps) {
  const [isCustom, setIsCustom] = useState(false)
  const isPreset = budget !== undefined && (BRIEF_BUDGETS as readonly number[]).includes(budget.value)

  return (
    <Card className="grid gap-x-5 gap-y-4 p-4 md:grid-cols-2 md:p-5">
      <Field label="Goal">
        <SegmentedControl
          label="Goal"
          options={asOptions(BRIEF_GOALS)}
          value={goal?.value}
          onChange={(value) => onChange({ field: "goal", value })}
        />
      </Field>
      <Field label="Horizon">
        <SegmentedControl
          label="Horizon"
          options={asOptions(BRIEF_HORIZONS)}
          value={horizon?.value}
          onChange={(value) => onChange({ field: "horizon", value })}
        />
      </Field>
      <Field label="Loss you can live with">
        <div className="flex max-w-xs items-center gap-3">
          <Slider
            aria-label="Loss you can live with"
            min={0}
            max={MAX_LOSS}
            step={1}
            value={[Math.min(loss?.value ?? 0, MAX_LOSS)]}
            onValueChange={([value]) => value && onChange({ field: "loss", value })}
          />
          <span className="min-w-11 text-right text-sm font-medium whitespace-nowrap">
            {loss ? `−${loss.value}%` : "Not set"}
          </span>
        </div>
      </Field>
      <Field label="Budget">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Budget"
            options={BUDGET_OPTIONS}
            value={isCustom || (budget && !isPreset) ? CUSTOM_BUDGET : budget ? String(budget.value) : undefined}
            onChange={(value) => {
              setIsCustom(value === CUSTOM_BUDGET)
              if (value !== CUSTOM_BUDGET) onChange({ field: "budget", value: Number(value) })
            }}
          />
          {(isCustom || (budget && !isPreset)) && (
            <input
              type="number"
              min={1}
              inputMode="numeric"
              aria-label="Budget in USDC"
              placeholder="USDC"
              value={budget?.value ?? ""}
              onChange={(event) =>
                Number(event.target.value) > 0 && onChange({ field: "budget", value: Number(event.target.value) })
              }
              className="bg-inputBg focus:ring-primary h-9 w-28 rounded-lg px-3 text-sm outline-none focus:ring dark:bg-white/10"
            />
          )}
        </div>
      </Field>
      <Field label="Include">
        <ChipInput
          label="Include"
          placeholder="+ Add"
          value={include.items}
          onChange={(items) => onChange({ field: "include", items })}
        />
      </Field>
      <Field label="Avoid">
        <ChipInput
          label="Avoid"
          placeholder="+ e.g. oil, Tesla"
          value={avoid.items}
          onChange={(items) => onChange({ field: "avoid", items })}
        />
      </Field>
    </Card>
  )
}
