"use client"

import { useParams, usePathname } from "next/navigation"

import { AppLink } from "@/components/AppLink/AppLink"
import { type PortfolioTab, PortfolioTabs } from "@/components/PortfolioDetail/PortfolioTabs"
import { Card } from "@/components/ui/card"

import { Skeleton, SkeletonText } from "./Skeleton"

// Which of the portfolio's pages is open, from the address
function tabOf(pathname: string): PortfolioTab {
  if (pathname.endsWith("/rules")) return "rules"
  if (pathname.endsWith("/activity")) return "activity"
  return "overview"
}

function BlockSkeleton({ height }: { height: number }) {
  return (
    <Card className="flex flex-col gap-3 p-5" style={{ height }}>
      <SkeletonText lineHeight={28} className="w-48" />
      <Skeleton className="min-h-0 w-full flex-1 rounded-xl" />
    </Card>
  )
}

// A portfolio's pages before their data: where it sits, its name's place and its tabs, which are real and set from the
// address, then the cards of the page that is open
export function PortfolioSkeleton() {
  const { id } = useParams<{ id: string }>()
  const tab = tabOf(usePathname() ?? "")

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-400 flex items-center gap-2 text-sm">
        <AppLink route="portfolios" className="hover:text-ink-100 transition-colors">
          Portfolios
        </AppLink>
        /
        <SkeletonText lineHeight={20} className="w-40" />
      </p>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 flex-none rounded-2xl" />
              <div className="flex flex-col gap-1.5">
                <SkeletonText lineHeight={40} className="w-64 max-w-full" />
                <SkeletonText lineHeight={20} className="w-80 max-w-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-28 rounded-full" />
              <Skeleton className="h-10 w-24 rounded-full" />
            </div>
          </div>
          <PortfolioTabs portfolioId={id} current={tab} />
        </header>
        {tab === "overview" ? (
          <>
            <BlockSkeleton height={248} />
            <BlockSkeleton height={412} />
            <BlockSkeleton height={329} />
            <div className="grid items-start gap-4 md:grid-cols-2">
              <BlockSkeleton height={308} />
              <BlockSkeleton height={308} />
            </div>
          </>
        ) : (
          <>
            <BlockSkeleton height={300} />
            <BlockSkeleton height={420} />
          </>
        )}
      </div>
    </div>
  )
}
