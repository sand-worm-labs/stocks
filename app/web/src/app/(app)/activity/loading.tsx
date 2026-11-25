import { ActivitySkeleton } from "@/components/Skeleton/ActivitySkeleton"
import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"

export default function Loading() {
  return (
    <SkeletonShell>
      <ActivitySkeleton />
    </SkeletonShell>
  )
}
