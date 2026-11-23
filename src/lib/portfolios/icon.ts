import type { IconType } from "react-icons"

import { DEFAULT_PORTFOLIO_ICON, PORTFOLIO_ICONS } from "@/constants/portfolio-icons"

// The icon a portfolio gets from what it is about, by its name first and then by the brief it was made from
export function iconFor(name: string, brief = ""): IconType {
  const byName = PORTFOLIO_ICONS.find(({ pattern }) => pattern.test(name))
  return (byName ?? PORTFOLIO_ICONS.find(({ pattern }) => pattern.test(brief)))?.icon ?? DEFAULT_PORTFOLIO_ICON
}
