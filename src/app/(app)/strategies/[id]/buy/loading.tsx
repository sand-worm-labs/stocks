import { PageSkeleton } from "@/components/Skeleton/PageSkeleton"
import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"

export default function Loading() {
  return (
    <SkeletonShell>
      <PageSkeleton />
    </SkeletonShell>
  )
}
