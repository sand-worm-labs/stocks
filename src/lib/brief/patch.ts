import { parseBrief } from "./parse"
import type { BriefChange, BriefFields, Goal, Horizon, NamedList, Span } from "./types"

const splice = (text: string, { start, end }: Span, replacement: string) =>
  text.slice(0, start) + replacement + text.slice(end)

// "robotics", "robotics and AI", "robotics, AI and chips"
export const joinList = (items: string[]) =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`

// A sentence added to the end of the brief, after whatever it ends with
const append = (text: string, sentence: string) => {
  const body = text.trimEnd()
  return `${body}${!body ? "" : /[.!?]$/.test(body) ? " " : ". "}${sentence}`
}

// How each goal reads where the brief names one, as a verb ("Grow 500 USDC") or as a noun ("for growth")
const GOAL_WORDS: Record<Goal, { verb: string; noun: string }> = {
  Growth: { verb: "grow", noun: "growth" },
  Income: { verb: "earn income on", noun: "income" },
  "Protect capital": { verb: "protect", noun: "capital protection" },
}
// How each horizon reads in a sentence ("over 6 months"), in words the agent reads back as the same horizon
const HORIZON_PHRASE: Record<Horizon, string> = {
  "Under 1 year": "6 months",
  "1–3 years": "1–3 years",
  "3+ years": "3+ years",
}
const VERBS = ["grow", "protect", "preserve"]

const matchCase = (original: string, replacement: string) =>
  /^[A-Z]/.test(original) ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement

// Takes a phrase out of the text with the joining word and spacing around it, so what is left still reads
const remove = (text: string, { start, end }: Span) =>
  (text.slice(0, start).replace(/\s*(?:,|\band\b|&|\bor\b)\s*$/i, " ") + text.slice(end).replace(/^\s*[,]/, ""))
    .replace(/\b(?:with|in|into|on|around)\s+(?=(?:over|for|max|only|[.,;]|$))/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;])/g, "$1")
    .trim()

function changeList(text: string, list: NamedList, items: string[], sentence: (items: string) => string) {
  const wanted = new Set(items.map((item) => item.toLowerCase()))
  const kept = (names: string[]) => names.filter((name) => wanted.has(name.toLowerCase()))
  const added = items.filter((item) => !list.items.some((existing) => existing.toLowerCase() === item.toLowerCase()))

  let next = text
  // Words and clauses further on in the text go first, so the spans before them stay where they were
  const edits: { span: Span; replacement?: string }[] = []

  for (const { item, span } of list.hits) if (!wanted.has(item.toLowerCase())) edits.push({ span })

  const clause = list.clause
  const clauseItems = clause ? [...kept(clause.items), ...added] : []
  if (clause) {
    if (clauseItems.length) edits.push({ span: clause.list, replacement: joinList(clauseItems) })
    else edits.push({ span: clause.whole })
  }

  for (const { span, replacement } of edits.sort((a, b) => b.span.start - a.span.start)) {
    next = replacement === undefined ? remove(next, span) : splice(next, span, replacement)
  }

  // Nowhere in the text lists them yet, so new ones get a sentence of their own
  return !clause && added.length ? append(next, sentence(joinList(added))) : next
}

// Writes a change made in a control into the brief, in the words the person used where they used some and in a new
// sentence where they didn't. What it returns reads back as the same change.
export function applyChange(text: string, fields: BriefFields, change: BriefChange): string {
  switch (change.field) {
    case "goal": {
      const { goal } = fields
      if (!goal) return append(text, `Goal: ${change.value}.`)

      const original = text.slice(goal.span.start, goal.span.end)
      const words = GOAL_WORDS[change.value]
      const written = splice(
        text,
        goal.span,
        matchCase(original, VERBS.includes(original.toLowerCase()) ? words.verb : words.noun)
      )

      // A goal written in words the agent can't read back would come up as a question again, so it is written plainly
      return parseBrief(written).goal?.value === change.value ? written : splice(text, goal.span, words.noun)
    }
    case "horizon": {
      const phrase = HORIZON_PHRASE[change.value]
      return fields.horizon ? splice(text, fields.horizon.span, phrase) : append(text, `Horizon: ${phrase}.`)
    }
    case "loss": {
      const phrase = `−${change.value}%`
      return fields.loss ? splice(text, fields.loss.span, phrase) : append(text, `I'd panic at ${phrase}.`)
    }
    case "budget": {
      const phrase = `${change.value.toLocaleString("en-US")} USDC`
      return fields.budget ? splice(text, fields.budget.span, phrase) : append(text, `Budget: ${phrase}.`)
    }
    case "include":
      return changeList(text, fields.include, change.items, (items) => `Include ${items}.`)
    case "avoid":
      return changeList(text, fields.avoid, change.items, (items) => `Avoid ${items}.`)
  }
}
