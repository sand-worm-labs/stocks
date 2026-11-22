import { PiSparkle } from "react-icons/pi"

export function AgentHeader() {
  return (
    <header className="border-border-secondary dark:border-border-tertiary flex items-center gap-2.5 border-b px-4 py-3">
      <span
        aria-hidden="true"
        className="bg-primary/10 text-primary border-primary/30 flex size-6 items-center justify-center rounded-md border"
      >
        <PiSparkle size={14} />
      </span>
      <h2 className="text-sm font-medium">Sandworm agent</h2>
    </header>
  )
}
