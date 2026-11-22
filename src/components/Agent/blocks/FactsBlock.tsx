import type { AgentBlock } from "@/lib/agent/types"

type FactsBlockProps = { block: Extract<AgentBlock, { type: "facts" }> }

export function FactsBlock({ block: { title, rows } }: FactsBlockProps) {
  return (
    <div data-block className="border-border-secondary dark:border-border-tertiary overflow-hidden rounded-xl border">
      <div className="border-border-secondary dark:border-border-tertiary border-b px-3 py-2 text-xs font-medium">
        {title}
      </div>
      <dl>
        {rows.map(({ label, term, value }) => (
          <div
            key={label}
            data-item
            className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-t px-3 py-2 text-sm first:border-t-0"
          >
            <dt className="flex flex-col">
              <span className="text-ink-400">{label}</span>
              {term && <span className="text-ink-300 text-xs">{term}</span>}
            </dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
