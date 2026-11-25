import { EmptyState } from "@/components/ui/empty-state"
import { STEPS } from "@/constants/components/portfolios/portfolios-empty"
import { CREATE_STRATEGY } from "@/constants/empty-state"

function Steps() {
  return (
    <ol className="grid grid-cols-3 gap-3 pb-6 text-left">
      {STEPS.map(({ icon: Icon, title, text }, i) => (
        <li
          key={title}
          className="border-border-secondary dark:border-border-tertiary bg-block-surface flex flex-col gap-1 rounded-xl border p-4"
        >
          <Icon size={20} className="text-ink-400 mb-1" />
          <span className="text-sm font-medium">
            {i + 1}. {title}
          </span>
          <span className="text-ink-400 text-xs">{text}</span>
        </li>
      ))}
    </ol>
  )
}

export function PortfoliosEmpty() {
  return (
    <EmptyState
      icon="portfolio"
      title="You have no strategies yet"
      description="A strategy is a plan for what to hold and when to buy or sell, kept as rules you can read. Each one holds its own stocks and cash."
      primary={CREATE_STRATEGY}
      preview={<Steps />}
    />
  )
}
