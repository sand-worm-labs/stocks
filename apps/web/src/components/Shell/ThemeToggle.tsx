"use client"

import { useTheme } from "next-themes"
import { PiMoon, PiSun } from "react-icons/pi"

import { Tooltip } from "@/components/Tooltip/Tooltip"
import { useMounted } from "@/hooks/use-mounted"
import { headerIconButtonClassName } from "@/styles/interactive"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const dark = mounted && resolvedTheme === "dark"
  const label = dark ? "Switch to light mode" : "Switch to dark mode"

  return (
    <Tooltip title={label}>
      <button
        type="button"
        aria-label={label}
        onClick={() => setTheme(dark ? "light" : "dark")}
        className={headerIconButtonClassName}
      >
        {dark ? <PiSun size={22} aria-hidden="true" /> : <PiMoon size={22} aria-hidden="true" />}
      </button>
    </Tooltip>
  )
}
