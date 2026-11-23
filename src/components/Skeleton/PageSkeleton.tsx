import { Card } from "@/components/ui/card"

import { Skeleton, SkeletonText } from "./Skeleton"

// For a page that has no placeholder of its own: a title, a row of figures and a large card, in the colour and corners
// of the real ones. A page that is looked at often has its own, shaped like it.
export function PageSkeleton({ figures = 3 }: { figures?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <SkeletonText lineHeight={40} className="w-64 max-w-full" />
        <SkeletonText lineHeight={20} className="w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: figures }, (_, i) => (
          <Card key={i} className="flex h-24 flex-col justify-center gap-2 px-5">
            <SkeletonText lineHeight={16} className="w-24" />
            <SkeletonText lineHeight={28} className="w-36" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="h-80 w-full rounded-xl" />
      </Card>
    </div>
  )
}
