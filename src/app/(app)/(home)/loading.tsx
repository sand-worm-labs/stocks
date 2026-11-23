import { HomeSkeleton } from "@/components/Skeleton/HomeSkeleton"
import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"

export default function Loading() {
  return (
    <SkeletonShell>
      <HomeSkeleton />
    </SkeletonShell>
  )
}
