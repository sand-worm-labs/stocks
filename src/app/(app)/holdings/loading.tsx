import { HoldingsSkeleton } from "@/components/Skeleton/HoldingsSkeleton"
import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"

export default function Loading() {
  return (
    <SkeletonShell>
      <HoldingsSkeleton />
    </SkeletonShell>
  )
}
