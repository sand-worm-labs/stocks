import { PiLockKey, PiWarningCircleFill } from "react-icons/pi"

import { RuleNumber } from "@/components/Rules/RuleNumber"
import type { AgentBlock } from "@/types/agent"

import { BlockFrame } from "./BlockFrame"

type RulesBlockProps = { block: Extract<AgentBlock, { type: "rules" }> }

export function RulesBlock({ block: { title, note, rules } }: RulesBlockProps) {
  return (
    <BlockFrame
      title={
        <>
          <PiLockKey aria-hidden="true" size={13} />
          {title}
        </>
      }
      aside={note}
    >
      <ol>
        {rules.map(({ id, label, state, detail }) => (
          <li
            key={id}
            data-item
            className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-t px-3 py-2 text-[13px] first:border-t-0"
          >
            <span className="flex items-center gap-2.5">
              <RuleNumber>{id}</RuleNumber>
              {label}
            </span>
            <span className="flex items-center gap-1.5">
              {detail && <span className="text-ink-400 text-xs">{detail}</span>}
              {state === "broken" && (
                <PiWarningCircleFill
                  aria-label="Can't be met"
                  data-check
                  size={15}
                  className="flex-none text-red-600 dark:text-red-400"
                />
              )}
            </span>
          </li>
        ))}
      </ol>
    </BlockFrame>
  )
}
