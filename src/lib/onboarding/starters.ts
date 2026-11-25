import type { Starter } from "@/types/onboarding"

const SHOWN = 3

export function pickStarters(starters: Starter[], interests: string[]) {
  const matches = (starter: Starter) => starter.themes.filter((theme) => interests.includes(theme)).length
  const matched = starters.filter((starter) => matches(starter) > 0).sort((a, b) => matches(b) - matches(a))
  const rest = starters.filter((starter) => !matched.includes(starter))
  return [...matched, ...rest].slice(0, SHOWN)
}
