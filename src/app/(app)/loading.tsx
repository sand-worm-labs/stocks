import { PageSkeleton } from "@/components/Skeleton/PageSkeleton"
import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"

// Shown the instant a link is clicked, for a page that has no placeholder of its own. Without one the old page stays put
// until the new one is whole, and a click feels like it did nothing.
export default function Loading() {
  return (
    <SkeletonShell>
      <PageSkeleton />
    </SkeletonShell>
  )
}
