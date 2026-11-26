import type { ThreadState } from "@/hooks/use-agent-thread"

// What the stream shows while the kept conversation is on its way, or could not be had
export function ThreadStatus({ state, onRetry }: { state: ThreadState; onRetry?: () => void }) {
  if (state === "ready") return null

  if (state === "failed") {
    return (
      <div role="alert" className="border-border-secondary dark:border-border-tertiary flex flex-col items-start gap-2 rounded-xl border p-3.5 text-sm leading-6">
        <span>I couldn&apos;t load this conversation. Your messages are kept, so nothing is lost.</span>
        <button type="button" onClick={onRetry} className="text-primary text-sm font-medium hover:underline">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div role="status" aria-label="Loading the conversation" className="flex flex-col gap-3">
      {["w-3/5", "w-4/5", "w-2/5"].map((width) => (
        <span key={width} className={`bg-hover-bg block h-4 animate-pulse rounded-md dark:bg-white/5 ${width}`} />
      ))}
    </div>
  )
}
