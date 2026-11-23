"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { PiMoon, PiSun } from "react-icons/pi"

import { Tooltip } from "@/components/Tooltip/Tooltip"
import { headerIconButtonClassName } from "@/styles/interactive"

// Dark mode in one click: the sun or the moon, for the other of the two. The theme chosen is only known in the browser, so
// it is drawn as light until the page is there.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
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
