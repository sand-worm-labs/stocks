import { MAX_PLANNABLE_ANNUAL_RETURN, MIN_LOSS_LIMIT } from "./brief.constants"

import type { BriefAnalysis, BriefFields, BriefIssue, MissingField } from "./brief.types"
import { parseBrief } from "./parse"

const YEARS = { day: 1 / 365, week: 1 / 52, month: 1 / 12, year: 1 } as const
const HORIZON_YEARS = { "Under 1 year": 0.5, "1–3 years": 2, "3+ years": 5 } as const
const NUMBER = String.raw`\d[\d,]*(?:\.\d+)?`

const number = (digits = "", scale = "") =>
  Number(digits.replace(/,/g, "")) * (/^k$/i.test(scale) ? 1_000 : /^m$/i.test(scale) ? 1_000_000 : 1)

const replaceAt = (text: string, start: number, end: number, replacement: string) =>
  text.slice(0, start) + replacement + text.slice(end)

function returnTarget(text: string, fields: BriefFields): BriefIssue | undefined {
  const pattern = new RegExp(
    String.raw`(${NUMBER})\s?(k)?\s?(?:usdc|usd|dollars)?\s+(?:into|to)\s+\$?(${NUMBER})\s?(k)?\s?(?:usdc|usd|dollars)?(?:\s*(?:by|in|within|over)\s+(?:the\s+)?(?:next\s+)?(\d+\s*)?(day|week|month|year)s?)?`,
    "i"
  )
  const match = text.match(pattern)
  if (!match) return undefined

  const from = number(match[1], match[2])
  const to = number(match[3], match[4])
  const multiple = to / from
  if (!from || multiple <= 1) return undefined

  const period = match[6]?.toLowerCase() as keyof typeof YEARS | undefined
  const years = period
    ? (Number(match[5]) || 1) * YEARS[period]
    : (HORIZON_YEARS[fields.horizon?.value ?? "1–3 years"] ?? 1)
  const annual = multiple ** (1 / years) - 1
  if (annual <= MAX_PLANNABLE_ANNUAL_RETURN) return undefined

  const when = period ? `in ${match[5]?.trim() || "a"} ${period}` : "that fast"
  const amount = from.toLocaleString("en-US")

  return {
    kind: "unrealistic",
    message: `${Math.round(multiple)}× ${when} isn't something any strategy can plan for. Chasing it means betting everything on one move, which is gambling, not investing.`,
    fixes: [`Grow ${amount} USDC over 3+ years`, `Learn with paper trading first, with ${amount} USDC`],
  }
}

function positionsConflict(text: string): BriefIssue | undefined {
  const match = text.match(
    /(\d+)\s*(?:\w+\s+){0,2}?(?:stocks|positions|companies|names)\D{0,40}?(?:at least|min(?:imum)?(?: of)?|each)\D{0,10}?(\d{1,3})\s?%/i
  )
  const count = Number(match?.[1])
  const minimum = Number(match?.[2])
  if (!match || !count || !minimum || count * minimum <= 100) return undefined

  const possible = Math.max(1, Math.floor(100 / minimum))
  const lowest = Math.max(1, Math.floor(100 / count))
  const swap = (from: string, to: string) => text.replace(new RegExp(`\\b${from}\\b`), to)

  return {
    kind: "conflict",
    message: `${count} stocks of at least ${minimum}% each need ${count * minimum}% of your money, and you have 100%.`,
    fixes: [swap(String(count), String(possible)), swap(`${minimum}\\s?%`, `${lowest}%`)],
  }
}

function lossLimit(text: string, { loss }: BriefFields): BriefIssue | undefined {
  if (!loss) return undefined

  const change = (to: number) => replaceAt(text, loss.span.start, loss.span.end, `−${to}%`)
  if (loss.value >= 100) {
    return {
      kind: "unrealistic",
      message: "A −100% limit is losing everything, which isn't a limit.",
      fixes: [change(20), change(35)],
    }
  }
  if (loss.value < MIN_LOSS_LIMIT) {
    return {
      kind: "unrealistic",
      message: `A −${loss.value}% limit is passed on an ordinary day, so nothing could stay invested.`,
      fixes: [change(10), change(20)],
    }
  }
  return undefined
}

const FIELDS: MissingField[] = ["goal", "horizon", "loss", "budget"]

export function analyzeBrief(text: string): BriefAnalysis {
  const fields = parseBrief(text)
  if (!text.trim()) return { status: "empty", fields, issues: [], missing: [] }

  const issues = [returnTarget(text, fields), positionsConflict(text), lossLimit(text, fields)].filter(
    (issue): issue is BriefIssue => !!issue
  )
  const missing = FIELDS.filter((field) => !fields[field])
  const understood =
    FIELDS.length > missing.length ||
    !!fields.maxPerStock ||
    fields.minLiquidity !== undefined ||
    !!fields.include.items.length ||
    !!fields.avoid.items.length

  if (!understood && !issues.length) return { status: "unreadable", fields, issues, missing }
  if (issues.length) return { status: "unrealistic", fields, issues, missing }
  return { status: missing.length ? "needs-answers" : "ready", fields, issues, missing }
}
