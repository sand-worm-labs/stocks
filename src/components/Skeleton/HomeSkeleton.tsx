import { HomeLayout } from "@/components/Home/HomeLayout"
import { PageHeader } from "@/components/PageHeader/PageHeader"
import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { Card } from "@/components/ui/card"
import { displayFont } from "@/config/fonts"
import { SUMMARY_CARD_SURFACE } from "@/constants/cards"
import { cn } from "@/lib/utils"

import { Skeleton, SkeletonAvatar, SkeletonPill, SkeletonText } from "./Skeleton"

const TILES = ["w-28", "w-24", "w-24"]
const LEGEND_ROWS = 7
const BOXES = 6
const DRAFTS = 4
const STOCKS = 6
const ACTIVITY = 4

// The stat tile under the total: an icon and two lines, in the real tile's border and shape
function StatTile({ width }: { width: string }) {
  return (
    <div className="border-border-secondary bg-block-surface/70 dark:border-border-tertiary flex items-center gap-3 rounded-2xl border py-2.5 pr-4 pl-2.5">
      <Skeleton className="size-9 flex-none rounded-xl" />
      <div className="flex flex-col">
        <SkeletonText lineHeight={16} className="w-16" />
        <SkeletonText lineHeight={24} className={width} />
      </div>
    </div>
  )
}

// What the total, the bar of where the money sits and the week's chart are before they come
function SummarySkeleton() {
  return (
    <Card className={SUMMARY_CARD_SURFACE}>
      <div className="flex flex-col gap-5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <SkeletonText lineHeight={20} className="w-56" />
            <div className="flex h-14 items-center gap-3">
              <SkeletonAvatar className="size-9" />
              <Skeleton className="h-10 w-60 rounded-xl" />
            </div>
            <div className="mt-1 flex h-[37px] items-center gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <SkeletonText lineHeight={20} className="w-48" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {TILES.map((width, i) => (
                <StatTile key={i} width={width} />
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Skeleton className="h-10 w-36 rounded-full" />
            <SkeletonText lineHeight={16} className="w-36" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex h-3 w-full gap-1">
            {["w-[38%]", "w-[24%]", "w-[16%]", "w-[12%]", "w-[10%]"].map((width) => (
              <Skeleton key={width} className={cn("h-full min-w-1.5 rounded-full", width)} />
            ))}
          </div>
          <div className="flex flex-col">
            {Array.from({ length: LEGEND_ROWS }, (_, i) => (
              <div key={i} className="flex h-8 items-center gap-3">
                <Skeleton className="size-2.5 flex-none rounded-full" />
                <SkeletonText lineHeight={20} className="w-40" />
                <SkeletonText lineHeight={20} className="ml-auto w-24" />
                <SkeletonText lineHeight={20} className="hidden w-20 sm:flex" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex h-[34px] items-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonPill key={i} className="h-8 w-16" />
            ))}
          </div>
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>
      </div>
    </Card>
  )
}

// A portfolio as a card, in the card's own corners, border and shadow
function BoxSkeleton() {
  return (
    <div className="border-border-secondary dark:border-border-tertiary bg-block-surface flex h-72 w-full flex-col overflow-hidden rounded-[28px] border shadow-[0_10px_40px_-18px_rgba(24,39,75,0.25)]">
      <div className="flex items-start justify-between px-5 pt-5">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex flex-col items-end gap-1">
          <SkeletonText lineHeight={24} className="w-16" />
          <SkeletonText lineHeight={20} className="w-28" />
        </div>
      </div>
      <div className="mt-2 h-[64px] w-full px-5">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="flex flex-1 items-center justify-center -space-x-2 px-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonAvatar key={i} className="ring-block-surface ring-2" />
        ))}
      </div>
      <div className="flex items-end justify-between gap-3 px-5 pb-5">
        <SkeletonText lineHeight={24} className="w-40" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  )
}

// The title and, at its right, the link to the rest, of a card that sits in the side column
function CardHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between p-5 pb-3">
      <SkeletonText lineHeight={28} className="w-44" />
      <SkeletonText lineHeight={20} className="w-16" />
    </div>
  )
}

function RailSkeleton() {
  return (
    <>
      <Card className="p-5">
        <div className="flex items-baseline justify-between">
          <SkeletonText lineHeight={28} className="w-36" />
          <SkeletonText lineHeight={20} className="w-10" />
        </div>
        <div className="mt-4 flex flex-col">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn("flex gap-3 pb-5 last:pb-0", i === 3 ? "h-[50px]" : "h-12")}>
              <SkeletonAvatar className="size-7" />
              <SkeletonText lineHeight={24} className="mt-0.5 w-44" />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeaderSkeleton />
        <div className="px-2 pb-2">
          {Array.from({ length: STOCKS }, (_, i) => (
            <div key={i} className="flex h-[82px] items-center gap-3 px-3">
              <SkeletonAvatar />
              <div className="flex min-w-0 flex-1 flex-col">
                <SkeletonText lineHeight={24} className="w-20" />
                <SkeletonText lineHeight={20} className="w-32" />
              </div>
              <div className="flex flex-col items-end">
                <SkeletonText lineHeight={24} className="w-16" />
                <SkeletonText lineHeight={20} className="w-12" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeaderSkeleton />
        <div className="px-2 pb-2">
          {Array.from({ length: ACTIVITY }, (_, i) => (
            <div key={i} className="flex h-[97px] items-start gap-3 px-3 py-2.5">
              <Skeleton className="size-9 flex-none rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col">
                <SkeletonText lineHeight={24} className="w-48" />
                <SkeletonText lineHeight={20} className="w-full" />
                <SkeletonText lineHeight={16} className="mt-0.5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

// The home before its data comes: the greeting's first word is real, and the name, the figures and the cards are where
// they will be
export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        titleClassName={cn(
          displayFont.className,
          "text-[44px] leading-[48px] font-normal tracking-tight md:text-[60px] md:leading-[64px]"
        )}
        title={
          <span className="flex items-center gap-3">
            GM,
            <Skeleton className="h-10 w-44 rounded-2xl md:h-12" />
          </span>
        }
      />
      <HomeLayout rail={<RailSkeleton />}>
        <SummarySkeleton />
        <section className="flex flex-col gap-3">
          <SectionHeader title="Your strategies" link={{ route: "portfolios", label: "See all →" }} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: BOXES }, (_, i) => (
              <BoxSkeleton key={i} />
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <SectionHeader title="Continue" />
          <Card>
            {Array.from({ length: DRAFTS }, (_, i) => (
              <div
                key={i}
                className="border-border-secondary dark:border-border-tertiary flex items-center gap-3 border-t p-4 first:border-t-0"
              >
                <Skeleton className="size-9 flex-none rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <SkeletonText lineHeight={24} className="w-44" />
                  <SkeletonText lineHeight={20} className="w-72 max-w-full" />
                </div>
                <SkeletonText lineHeight={20} className="w-20" />
              </div>
            ))}
          </Card>
        </section>
      </HomeLayout>
    </div>
  )
}
