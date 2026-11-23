import { cn } from "@/lib/utils"

function Block({ className }: { className?: string }) {
  return <div className={cn("bg-ink-300/20 rounded-2xl motion-safe:animate-pulse", className)} />
}

// The shape most pages share: a title, a row of figures and a large block of content
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-6">
      <Block className="h-10 w-64 md:h-12" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows }, (_, i) => (
          <Block key={i} className="h-24" />
        ))}
      </div>
      <Block className="h-80" />
    </div>
  )
}
