"use client"

import { useTheme } from "next-themes"
import { type ReactNode, useEffect, useState } from "react"
import { PiMoon, PiSun } from "react-icons/pi"

import { cn } from "@/lib/utils"

type ThemeId = "light" | "dark"

type ThemeOption = {
  id: ThemeId
  label: string
  description: string
  icon: ReactNode
}

const THEMES: ThemeOption[] = [
  {
    id: "light",
    label: "Light theme",
    description: "Bright and clean interface for daytime use",
    icon: <PiSun className="size-5" aria-hidden="true" />,
  },
  {
    id: "dark",
    label: "Dark theme",
    description: "Easy on the eyes for extended work sessions",
    icon: <PiMoon className="size-5" aria-hidden="true" />,
  },
]

// The little window in each card: the page colour and the shade of its blocks, drawn the way that theme looks
const PREVIEW = {
  light: { page: "bg-[#FDFDFD]", block: "bg-[#E7F3F6]" },
  dark: { page: "bg-[#09091B]", block: "bg-[#352F37]" },
} satisfies Record<ThemeId, { page: string; block: string }>

type ThemeCardProps = { option: ThemeOption; selected: boolean; onSelect: () => void }

function ThemeCard({ option, selected, onSelect }: ThemeCardProps) {
  const { page, block } = PREVIEW[option.id]

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="border-border-secondary bg-block-surface dark:border-border-tertiary w-full rounded-3xl border p-6 text-left transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="dark:bg-base-600 border-border-secondary dark:border-border-tertiary text-ink-400 rounded-full border bg-[#EFF1F2] p-3">
          {option.icon}
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-medium">{option.label}</h3>
            {selected && <div className="bg-primary size-2 rounded-full" />}
          </div>
          <p className="text-ink-400 text-sm">{option.description}</p>
        </div>
      </div>

      <div className="border-border-secondary dark:border-border-tertiary mt-4 overflow-hidden rounded-2xl border">
        <div className={cn("h-32 p-3", page)}>
          <div className="mb-2 flex gap-2">
            <div className={cn("size-2 rounded-full", block)} />
            <div className={cn("size-2 rounded-full", block)} />
            <div className={cn("size-2 rounded-full", block)} />
          </div>
          <div className="space-y-2 opacity-95">
            <div className={cn("h-10 rounded-xl", block)} />
            <div className={cn("h-2 w-3/4 rounded", block)} />
            <div className={cn("h-2 w-1/2 rounded", block)} />
          </div>
        </div>
      </div>
    </button>
  )
}

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  // The chosen theme is only known in the browser, so nothing is shown as picked until the page is there
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-medium">Appearance</h2>
        <p className="text-ink-400 text-sm">Choose how the app looks to you. Pick light or dark.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {THEMES.map((option) => (
          <ThemeCard
            key={option.id}
            option={option}
            selected={mounted && theme === option.id}
            onSelect={() => setTheme(option.id)}
          />
        ))}
      </div>
    </section>
  )
}
