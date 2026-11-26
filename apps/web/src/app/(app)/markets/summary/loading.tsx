import { MarketSummarySkeleton } from "@/components/Skeleton/MarketsSkeleton"
import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"

export default function Loading() {
  return (
    <SkeletonShell>
      <MarketSummarySkeleton />
    </SkeletonShell>
  )
}
