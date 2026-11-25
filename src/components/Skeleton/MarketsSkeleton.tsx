import { LiveBadge } from "@/components/Markets/LiveBadge"
import { MarketTabs } from "@/components/Markets/MarketTabs"
import { PageHeader } from "@/components/PageHeader/PageHeader"
import { Card } from "@/components/ui/card"

import { CHIPS, ROWS } from "@/constants/components/skeleton/markets-skeleton"
import { Skeleton, SkeletonAvatar, SkeletonPill, SkeletonText } from "./Skeleton"
import { type SkeletonColumn, SkeletonTable, SkeletonTableFooter } from "./SkeletonTable"

const COLUMNS: SkeletonColumn[] = [
  { width: "w-4" },
  { width: "w-24", lead: true },
  { width: "w-20" },
  { width: "w-14", className: "hidden sm:table-cell" },
  { width: "w-14" },
  { width: "w-14" },
  { width: "w-28", className: "hidden lg:table-cell", cell: <Skeleton className="h-7 w-28" /> },
  { width: "w-20", className: "hidden md:table-cell" },
  { width: "w-20", className: "hidden lg:table-cell" },
  { width: "w-20", className: "hidden md:table-cell" },
  { width: "w-20", className: "hidden xl:table-cell", cell: <Skeleton className="h-6 w-20 rounded-full" /> },
  { width: "w-10", className: "text-right", cell: <Skeleton className="ml-auto h-9 w-10 rounded-full" /> },
]

function TapeSkeleton() {
  return (
    <div className="border-border-secondary bg-block-surface dark:border-border-tertiary flex h-16 items-stretch overflow-hidden rounded-2xl border">
      <div className="border-border-secondary dark:border-border-tertiary flex flex-none flex-col justify-center border-r px-4 py-3">
        <SkeletonText lineHeight={20} className="w-28" />
        <SkeletonText lineHeight={16} className="w-36" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-40 flex-none rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function HighlightsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {[0, 1, 2].map((card) => (
        <Card key={card} className="flex h-[220px] flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-7 flex-none rounded-lg" />
            <SkeletonText lineHeight={20} className="w-32" />
          </div>
          <div className="flex flex-col gap-2.5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex h-[43px] items-center gap-3">
                <SkeletonAvatar className="size-8" />
                <SkeletonText lineHeight={20} className="w-24" />
                <SkeletonText lineHeight={20} className="ml-auto w-16" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

export function MarketsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Markets</h1>
      <MarketTabs current="markets" />
      <TapeSkeleton />
      <HighlightsSkeleton />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 py-2 md:mx-0 md:px-0">
        {CHIPS.map((width, i) => (
          <SkeletonPill key={i} className={`h-[30px] ${width}`} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 min-w-0 flex-1 md:max-w-sm" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonText lineHeight={20} className="ml-auto w-72 max-w-full" />
        <SkeletonTable columns={COLUMNS} rows={ROWS} avatar="size-8" />
        <SkeletonTableFooter />
      </div>
    </div>
  )
}

function ChartCardSkeleton({ height }: { height: number }) {
  return (
    <Card className="flex flex-col gap-3 p-5" style={{ height }}>
      <SkeletonText lineHeight={28} className="w-56" />
      <SkeletonText lineHeight={20} className="w-72 max-w-full" />
      <Skeleton className="min-h-0 w-full flex-1 rounded-xl" />
    </Card>
  )
}

export function MarketSummarySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <MarketTabs current="marketSummary" />
      <PageHeader
        title="Market summary"
        description="Every tokenized stock on Base. The list comes from CoinGecko, the prices from the pools they trade in."
        actions={<LiveBadge />}
      />
      <Card className="grid h-[118px] grid-cols-2 content-center gap-5 px-5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col">
            <SkeletonText lineHeight={20} className="w-24" />
            <SkeletonText lineHeight={36} className="w-32" />
          </div>
        ))}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height={357} />
        <ChartCardSkeleton height={357} />
      </div>
      <ChartCardSkeleton height={382} />
    </div>
  )
}
