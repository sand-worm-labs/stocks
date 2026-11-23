"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { SegmentedControl } from "@/components/ui/segmented-control"

import { SettingRow } from "./SettingRow"
import { SettingsSection } from "./SettingsSection"

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  // The chosen theme is only known in the browser, so nothing is shown as picked until the page is there
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <SettingsSection title="Appearance" description="How the app looks to you.">
      <SettingRow title="Theme" description="It starts light, and stays as you leave it">
        <SegmentedControl label="Theme" options={THEMES} value={mounted ? theme : undefined} onChange={setTheme} />
      </SettingRow>
    </SettingsSection>
  )
}
