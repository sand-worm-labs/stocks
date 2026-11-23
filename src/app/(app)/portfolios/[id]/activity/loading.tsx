import { PortfolioSkeleton } from "@/components/Skeleton/PortfolioSkeleton"
import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"

export default function Loading() {
  return (
    <SkeletonShell>
      <PortfolioSkeleton />
    </SkeletonShell>
  )
}
