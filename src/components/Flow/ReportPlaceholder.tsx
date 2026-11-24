import { PiFileText } from "react-icons/pi"

// Where the report will be, before there is one
export function ReportPlaceholder() {
  return (
    <div className="border-border dark:border-border-tertiary flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-20 text-center">
      <span className="bg-inputBg text-ink-400 flex size-11 items-center justify-center rounded-xl dark:bg-white/5">
        <PiFileText size={22} aria-hidden="true" />
      </span>
      <p className="font-medium">Your results will appear here</p>
      <p className="text-ink-400 max-w-md text-sm leading-6">
        Confirm the rules and I&apos;ll run one Sandworm notebook on your idea: universe, allocation, liquidity,
        backtest, evidence and what I couldn&apos;t do.
      </p>
    </div>
  )
}
