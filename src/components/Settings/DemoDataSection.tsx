"use client"

import { useState, useTransition } from "react"

import { ChoiceChips } from "@/components/ui/choice-chips"
import { DEMO_MODEL_CHOICES } from "@/constants/demo"
import { saveModelCount } from "@/lib/demo/actions"

import { SettingRow } from "./SettingRow"
import { SettingsSection } from "./SettingsSection"

// How many portfolios to try the app with, from none to a thousand. Home, Holdings and Portfolios all follow it.
export function DemoDataSection({ count }: { count: number }) {
  const [value, setValue] = useState(count)
  const [, startTransition] = useTransition()

  return (
    <SettingsSection title="Demo strategies" description="How many strategies to try the app with, at any size.">
      <SettingRow title="Strategies" description="None shows the home of a new account">
        <ChoiceChips
          label="Number of strategies"
          choices={DEMO_MODEL_CHOICES}
          value={value}
          onChange={(next) => {
            setValue(next)
            startTransition(() => saveModelCount(next))
          }}
        />
      </SettingRow>
    </SettingsSection>
  )
}
