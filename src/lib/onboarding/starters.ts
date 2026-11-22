import type { Starter } from "./types"

const SHOWN = 3

// The starting briefs to offer: those for the themes picked, the best matches first, and the most general ones to fill up
// to three. Someone who didn't pick, or isn't sure, gets the general ones.
export function pickStarters(starters: Starter[], interests: string[]) {
  const matches = (starter: Starter) => starter.themes.filter((theme) => interests.includes(theme)).length
  const matched = starters.filter((starter) => matches(starter) > 0).sort((a, b) => matches(b) - matches(a))
  const rest = starters.filter((starter) => !matched.includes(starter))
  return [...matched, ...rest].slice(0, SHOWN)
}
