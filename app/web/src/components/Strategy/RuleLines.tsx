import { PiCheck, PiX } from "react-icons/pi"

import { BLOCK_WORD, LEAD, ROW, RULE, SHARE, WORD } from "@/constants/components/strategy/rule-lines"
import { TONE_TILE_CLASSNAME } from "@/constants/tone"
import { isExitRule } from "@/lib/rules/readings"
import { explainRule, specOf } from "@/lib/rules/spec"
import type { Step } from "@/lib/strategy/explain"
import { cn } from "@/lib/utils"
import type { Rule } from "@/types/rules"

import { LEADS } from "./leads"

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

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

export function StepLine({ step, standalone = false }: { step: Step; standalone?: boolean }) {
  const { depth, kind, block, text, share } = step
  const word = kind === "if" ? "If" : kind === "then" ? "Then" : kind === "else" ? "Otherwise" : undefined
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
