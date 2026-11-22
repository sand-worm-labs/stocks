import type { AgentBlock } from "@/lib/agent/types"

import { BlockFrame } from "./BlockFrame"

type FactsBlockProps = { block: Extract<AgentBlock, { type: "facts" }> }

export function FactsBlock({ block: { title, rows } }: FactsBlockProps) {
  return (
    <BlockFrame title={title}>
      <dl>
        {rows.map(({ label, term, value }) => (
          <div
            key={label}
            data-item
            className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-t px-3 py-2 text-[13px] first:border-t-0"
          >
            <dt className="flex flex-col">
              <span className="text-ink-200">{label}</span>
              {term && <span className="text-ink-300 text-xs">{term}</span>}
            </dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </BlockFrame>
  )
}
