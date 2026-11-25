import { Card } from "@/components/ui/card"

import { Skeleton, SkeletonPill, SkeletonText } from "./Skeleton"
import { SkeletonScope } from "./SkeletonScope"

export function TabSkeleton() {
  return (
    <>
      <SkeletonScope />
      <Card role="status" aria-label="Loading" className="h-[636px] overflow-hidden">
        <div className="flex h-[62px] items-center justify-between gap-3 px-5">
          <SkeletonText lineHeight={28} className="w-40" />
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonPill key={i} className="h-8 w-14" />
            ))}
          </div>
        </div>
        <div className="px-4 pt-3">
          <Skeleton className="h-[540px] w-full rounded-xl" />
        </div>
      </Card>
    </>
  )
}
