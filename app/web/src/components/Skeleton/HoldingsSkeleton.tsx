"use client"

import { useSearchParams } from "next/navigation"

import { HoldingsTabs } from "@/components/Holdings/HoldingsTabs"
import { HoldingsViewTabs } from "@/components/Holdings/HoldingsViewTabs"
import { PageHeader } from "@/components/PageHeader/PageHeader"
import { SearchInput } from "@/components/SearchInput/SearchInput"
import { Card } from "@/components/ui/card"
import {
  FOLDED_MODELS,
  OPEN_MODELS,
  ROWS_IN_MODEL,
  STOCK_ROWS,
} from "@/constants/components/skeleton/holdings-skeleton"
import { cn } from "@/lib/utils"

import { Skeleton, SkeletonAvatar, SkeletonText } from "./Skeleton"

function StockRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-3", className)}>
      <SkeletonAvatar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SkeletonText lineHeight={24} className="w-20" />
        <SkeletonText lineHeight={20} className="w-44" />
      </div>
      <div className="hidden w-44 items-center gap-2.5 md:flex">
        <Skeleton className="h-2 flex-1 rounded-full" />
        <SkeletonText lineHeight={20} className="w-11" />
      </div>
      <div className="flex w-28 flex-col items-end">
        <SkeletonText lineHeight={24} className="w-20" />
        <SkeletonText lineHeight={20} className="w-24" />
      </div>
    </div>
  )
}

function ModelSkeleton({ open }: { open: boolean }) {
  return (
    <Card className="relative overflow-hidden">
      <Skeleton className="absolute inset-y-0 left-0 w-1 rounded-none" />
      <div className="flex items-center gap-3.5 py-4 pr-5 pl-6">
        <Skeleton className="size-11 flex-none rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col">
          <SkeletonText lineHeight={24} className="w-48" />
          <SkeletonText lineHeight={20} className="w-56" />
        </div>
        <div className="hidden -space-x-2 sm:flex">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonAvatar key={i} className="ring-block-surface size-8 ring-2" />
          ))}
        </div>
        <Skeleton className="hidden h-8 w-24 lg:block" />
        <div className="flex flex-col items-end gap-1">
          <SkeletonText lineHeight={24} className="w-24" />
          <SkeletonText lineHeight={16} className="w-16" />
        </div>
        <Skeleton className="size-4 flex-none rounded-full" />
      </div>
      {open && (
        <div className="px-2 pb-2">
          {Array.from({ length: ROWS_IN_MODEL }, (_, i) => (
            <StockRowSkeleton key={i} className="h-[69px]" />
          ))}
        </div>
      )}
    </Card>
  )
}

function PagesSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3">
      <SkeletonText lineHeight={20} className="w-24" />
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-12 rounded-full" />
        ))}
      </div>
    </div>
  )
}

export function HoldingsSkeleton() {
  const params = useSearchParams()
  const tab = params.get("tab") === "summary" ? "summary" : "list"
  const view = params.get("view") === "stocks" ? "stocks" : "models"
  const query = params.get("q") ?? ""

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Holdings" description="Every stock you hold, and the strategy it is held in" />
      <HoldingsTabs current={tab} />
      {tab === "summary" ? (
        <>
          <Skeleton className="h-[168px] w-full rounded-2xl" />
          <Skeleton className="h-[420px] w-full rounded-2xl" />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <HoldingsViewTabs view={view} query={query} />
            <SearchInput param="q" label="Search your portfolio" placeholder="Search stocks you hold..." />
          </div>
          <div className="flex flex-col gap-6">
            {view === "stocks" ? (
              <Card className="px-2 py-2">
                {Array.from({ length: STOCK_ROWS }, (_, i) => (
                  <StockRowSkeleton key={i} className="h-16" />
                ))}
              </Card>
            ) : (
              <>
                {Array.from({ length: OPEN_MODELS }, (_, i) => (
                  <ModelSkeleton key={i} open />
                ))}
                {Array.from({ length: FOLDED_MODELS }, (_, i) => (
                  <ModelSkeleton key={`folded-${i}`} open={false} />
                ))}
              </>
            )}
            <PagesSkeleton />
          </div>
        </>
      )}
    </div>
  )
}
