import { MarketsSkeleton } from "@/components/Skeleton/MarketsSkeleton"
import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"

export default function Loading() {
  return (
    <SkeletonShell>
      <MarketsSkeleton />
    </SkeletonShell>
  )
}
