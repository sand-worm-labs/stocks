// What a tab shows while it reads the chain or the market: a block where its content will be
export function TabSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="bg-ink-300/20 h-72 rounded-2xl motion-safe:animate-pulse"
    />
  )
}
