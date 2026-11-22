"use client"

import { type ReactNode, useState } from "react"

import { Card } from "@/components/ui/card"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Slider } from "@/components/ui/slider"
import { BRIEF_BUDGETS, BRIEF_GOALS, BRIEF_HORIZONS, CUSTOM_BUDGET, MAX_LOSS } from "@/constants/brief"
import { settingsFrom } from "@/lib/brief/controls"
import type { BriefField } from "@/lib/brief/types"

import { ChipInput } from "./ChipInput"

const asOptions = (values: readonly string[]) => values.map((value) => ({ value, label: value }))

const BUDGET_OPTIONS = [
  ...BRIEF_BUDGETS.map((value) => ({
    value: String(value),
    label: value.toLocaleString("en-US"),
  })),
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

// What the agent read from the brief, as choices to change. A choice it couldn't read starts empty.
export function BriefControls({ fields }: { fields: BriefField[] }) {
  const [settings, setSettings] = useState(() => settingsFrom(fields))
  const set =
    <K extends keyof typeof settings>(key: K) =>
    (value: (typeof settings)[K]) =>
      setSettings((current) => ({ ...current, [key]: value }))

  return (
    <Card className="grid gap-x-5 gap-y-4 p-4 md:grid-cols-2 md:p-5">
      <Field label="Goal">
        <SegmentedControl label="Goal" options={asOptions(BRIEF_GOALS)} value={settings.goal} onChange={set("goal")} />
      </Field>
      <Field label="Horizon">
        <SegmentedControl
          label="Horizon"
          options={asOptions(BRIEF_HORIZONS)}
          value={settings.horizon}
          onChange={set("horizon")}
        />
      </Field>
      <Field label="Loss you can live with">
        <div className="flex max-w-xs items-center gap-3">
          <Slider
            aria-label="Loss you can live with"
            min={0}
            max={MAX_LOSS}
            step={1}
            value={[settings.loss ?? 0]}
            onValueChange={([loss]) => set("loss")(loss)}
          />
          <span className="min-w-11 text-right text-sm font-medium whitespace-nowrap">
            {settings.loss === undefined ? "Not set" : `−${settings.loss}%`}
          </span>
        </div>
      </Field>
      <Field label="Budget">
        <SegmentedControl label="Budget" options={BUDGET_OPTIONS} value={settings.budget} onChange={set("budget")} />
      </Field>
      <Field label="Include">
        <ChipInput label="Include" placeholder="+ Add" value={settings.include} onChange={set("include")} />
      </Field>
      <Field label="Avoid">
        <ChipInput label="Avoid" placeholder="+ e.g. oil, Tesla" value={settings.avoid} onChange={set("avoid")} />
      </Field>
    </Card>
  )
}
