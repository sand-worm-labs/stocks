import { PageHeader } from "@/components/PageHeader/PageHeader"
import { Card } from "@/components/ui/card"

import { Skeleton, SkeletonPill, SkeletonText } from "./Skeleton"

// The days, and how many events each had, as the list will show them
const DAYS = [4, 3, 5]
// The filters, each as wide as its label
const FILTERS = ["w-[46px]", "w-[72px]", "w-[67px]", "w-[86px]", "w-[83px]"]

function EventRow() {
  return (
    <div className="border-border-secondary dark:border-border-tertiary flex h-[76px] items-center gap-3 border-t px-5 first:border-t-0">
      <Skeleton className="size-9 flex-none rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col">
        <SkeletonText lineHeight={24} className="w-64 max-w-full" />
        <SkeletonText lineHeight={20} className="w-96 max-w-full" />
      </div>
      <SkeletonText lineHeight={20} className="hidden w-16 sm:flex" />
    </div>
  )
}

// The activity before its data: the title and its line are real, and the filters and the days of events are where they
// will be
export function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Activity" description={<>Trades, refusals, alerts and everything the agent did</>} />
      <div className="-mx-4 flex gap-2 overflow-x-hidden px-4 md:mx-0 md:px-0">
        {FILTERS.map((width) => (
          <SkeletonPill key={width} className={width} />
        ))}
      </div>
      <div className="flex flex-col gap-6">
        {DAYS.map((events, day) => (
          <section key={day} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <SkeletonText lineHeight={20} className="w-16" />
              <SkeletonText lineHeight={16} className="w-32" />
            </div>
            <Card>
              {Array.from({ length: events }, (_, i) => (
                <EventRow key={i} />
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  )
}
