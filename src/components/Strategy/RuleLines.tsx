import { PiCheck, PiX } from "react-icons/pi"

import { TONE_TILE_CLASSNAME } from "@/constants/tone"
import { isExitRule } from "@/lib/rules/readings"
import { explainRule, specOf } from "@/lib/rules/spec"
import type { Rule } from "@/lib/rules/types"
import type { Step } from "@/lib/strategy/explain"
import { cn } from "@/lib/utils"

import { LEADS } from "./leads"

// The two kinds of line a set of rules is read as, shared by the Rules tab and the Overview, so a rule looks the same wherever
// it is shown: a lead word, what it says, and for a rule that can be broken whether it holds.

const LEAD = "flex-none rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase"
// The lead words are all one width, the width of the longest, so what follows them lines up down the list
const WORD = cn(LEAD, "w-[5.5rem] text-center")
const BLOCK_WORD = { asset: "Stock", cash: "Cash", filter: "Filter", group: "Split", rebalance: "Rebalance" } as const
// Each line begins with a capital, whatever the lead word before it
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const SHARE = "bg-hover-bg text-ink-100 normal-case tabular-nums dark:bg-white/10"
// The line under every rule
const RULE = "border-border-secondary dark:border-border-tertiary border-b"
const ROW = "flex items-baseline gap-2.5 py-1.5 text-[15px] leading-6"

// A rule: Never, Only or Always, what it says, and whether it holds
export function RuleLine({ rule }: { rule: Rule }) {
  const spec = specOf(rule)
  const { lead, text } = spec ? explainRule(spec) : { lead: "Always" as const, text: rule.label }
  const holds = rule.state === "holds"
  // An exit is watched, and past its line it sells; it is not held to a line the way a limit is
  const exit = isExitRule(rule)

  return (
    <li className={cn(RULE, ROW, "py-3")}>
      <span className={cn(WORD, LEADS[lead].className)}>{lead}</span>
      <span className="flex-1">{capital(text)}</span>
      <span
        className={cn(
          "inline-flex flex-none items-center gap-1 text-xs font-medium",
          holds ? "text-emerald-700 dark:text-emerald-400" : "text-error"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-4 items-center justify-center rounded-full",
            holds ? TONE_TILE_CLASSNAME.positive : TONE_TILE_CLASSNAME.negative
          )}
        >
          {holds ? <PiCheck size={10} /> : <PiX size={10} />}
        </span>
        {exit ? (holds ? "Watching" : "Sells") : holds ? "Holds" : "Broken"}
      </span>
    </li>
  )
}

// A line of what the strategy does: If, Then, Otherwise, or the block it holds or picks with. `standalone` is for a line lifted
// out of its list, which no longer introduces one that follows it.
export function StepLine({ step, standalone = false }: { step: Step; standalone?: boolean }) {
  const { depth, kind, block, text, share } = step
  const word = kind === "if" ? "If" : kind === "then" ? "Then" : kind === "else" ? "Otherwise" : undefined
  // A line that holds or picks says which block it came from, in a word
  const kindWord = block ? BLOCK_WORD[block] : undefined
  // Lifted out of its list, a line no longer introduces one that follows it
  const said = standalone ? text.replace(/:$/, ".") : text

  return (
    // The line runs the full width, so the indent is set on what is inside it
    <li className={RULE}>
      <div
        style={{ marginLeft: depth * 22 }}
        className={cn(
          ROW,
          "py-2.5",
          depth > 0 && "border-border-secondary dark:border-border-tertiary border-l pl-3.5"
        )}
      >
        {word && <span className={cn(WORD, LEADS[word].className)}>{word}</span>}
        {kindWord && <span className={cn(WORD, LEADS[kindWord].className)}>{kindWord}</span>}
        {share && <span className={cn(LEAD, SHARE)}>{share}</span>}
        {said && (
          <span className={kind === "split" || kind === "keep" ? "font-medium" : undefined}>{capital(said)}</span>
        )}
      </div>
    </li>
  )
}
