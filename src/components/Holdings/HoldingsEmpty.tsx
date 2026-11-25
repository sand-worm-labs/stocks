import { PiCaretDown } from "react-icons/pi"

import { EmptyState, Ghost } from "@/components/ui/empty-state"
import { STOCKS } from "@/constants/components/holdings/holdings-empty"
import { CREATE_STRATEGY, LOOK_AROUND } from "@/constants/empty-state"

function HeldPreview() {
  return (
    <div className="border-border-secondary dark:border-border-tertiary bg-block-surface rounded-t-2xl border border-b-0 [mask-image:linear-gradient(to_bottom,black_35%,transparent)]">
      <div className="flex items-center gap-3 px-5 py-4">
        <Ghost className="size-10 rounded-xl" />
        <div className="flex flex-1 flex-col items-start gap-1.5">
          <Ghost className="h-3 w-32" />
          <Ghost className="h-2.5 w-20 opacity-60" />
        </div>
        <PiCaretDown size={16} className="text-ink-400" />
      </div>
      {STOCKS.map((width) => (
        <div
          key={width}
          className="border-border-secondary dark:border-border-tertiary flex items-center gap-3 border-t px-5 py-3"
        >
          <Ghost className="size-8" />
          <Ghost className={`h-3 ${width}`} />
          <Ghost className="ml-auto h-3 w-14" />
        </div>
      ))}
    </div>
  )
}

export function HoldingsEmpty() {
  return (
    <EmptyState
      icon="holdings"
      title="You don't hold any stocks yet"
      description="Every stock you buy is held inside a strategy, and listed here under the strategy that holds it. Make a strategy and the stocks it buys appear here."
      primary={CREATE_STRATEGY}
      secondary={LOOK_AROUND}
      preview={<HeldPreview />}
    />
  )
}
