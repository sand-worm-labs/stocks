import { PortfoliosSkeleton } from "@/components/Skeleton/PortfoliosSkeleton"
import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"

export default function Loading() {
  return (
    <SkeletonShell>
      <PortfoliosSkeleton />
    </SkeletonShell>
  )
}
