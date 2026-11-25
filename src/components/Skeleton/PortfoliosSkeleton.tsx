import { PageHeader } from "@/components/PageHeader/PageHeader"
import { NewPortfolioButton } from "@/components/Portfolios/NewPortfolioButton"
import { Card } from "@/components/ui/card"
import { SUMMARY_CARD_SURFACE } from "@/constants/cards"

import { ROWS } from "@/constants/components/skeleton/portfolios-skeleton"
import { Skeleton, SkeletonAvatar, SkeletonPill, SkeletonText } from "./Skeleton"
import { type SkeletonColumn, SkeletonTable, SkeletonTableFooter } from "./SkeletonTable"

const COLUMNS: SkeletonColumn[] = [
  { width: "w-20", lead: true, className: "w-[37%]" },
  { width: "w-24", className: "w-[14%]" },
  { width: "w-24", className: "w-[10%]" },
  { width: "w-20", className: "w-[10%]" },
  { width: "w-24", className: "w-[18%]", cell: <Skeleton className="hidden h-7 w-24 md:block" /> },
  { width: "w-20", className: "hidden w-[9%] lg:table-cell" },
]

export function PortfoliosSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My strategies" actions={<NewPortfolioButton />} />

      <Card className={SUMMARY_CARD_SURFACE}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 px-5 py-4 md:px-6">
          <div className="flex flex-col gap-0.5">
            <SkeletonText lineHeight={20} className="w-24" />
            <div className="flex h-10 items-center gap-2.5">
              <SkeletonAvatar className="size-7" />
              <Skeleton className="h-8 w-48 rounded-xl" />
            </div>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Skeleton className="h-7 w-20 rounded-full" />
            <SkeletonText lineHeight={20} className="w-44" />
          </div>
        </div>

        <div className="border-border-secondary dark:border-border-tertiary flex flex-wrap items-center gap-x-3 gap-y-2.5 border-t px-4 py-3 md:px-5">
          <Skeleton className="h-10 w-full flex-none sm:w-56" />
          <div className="flex flex-wrap gap-2">
            {["w-16", "w-24", "w-20", "w-20"].map((width, i) => (
              <SkeletonPill key={i} className={width} />
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-9 w-48 rounded-xl" />
            <Skeleton className="h-9 w-[72px] rounded-xl" />
          </div>
        </div>
      </Card>

      <SkeletonTable columns={COLUMNS} rows={ROWS} />
      <SkeletonTableFooter />
    </div>
  )
}
