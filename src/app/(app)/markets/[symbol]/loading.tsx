import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"
import { TokenSkeleton } from "@/components/Skeleton/TokenSkeleton"

export default function Loading() {
  return (
    <SkeletonShell>
      <TokenSkeleton />
    </SkeletonShell>
  )
}
