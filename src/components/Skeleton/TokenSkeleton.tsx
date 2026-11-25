"use client"

import { useParams, useSearchParams } from "next/navigation"

import { BackLink } from "@/components/BackLink/BackLink"
import { TokenTabs } from "@/components/Token/TokenTabs"
import { DEFAULT_TOKEN_TAB, TOKEN_TABS, type TokenTabId } from "@/constants/token"

import { Skeleton, SkeletonAvatar, SkeletonText } from "./Skeleton"
import { TabSkeleton } from "./TabSkeleton"

export function TokenSkeleton() {
  const { symbol } = useParams<{ symbol: string }>()
  const tab = useSearchParams().get("tab")
  const current = TOKEN_TABS.find(({ id }) => id === tab)?.id ?? DEFAULT_TOKEN_TAB

  return (
    <div className="flex flex-col gap-6">
      <BackLink route="markets" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SkeletonAvatar className="size-14" />
          <div className="flex flex-col gap-1">
            <SkeletonText lineHeight={40} className="w-72 max-w-full" />
            <SkeletonText lineHeight={50} className="w-80 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-[50px] w-[203px] rounded-xl" />
      </div>
      <TokenTabs tokenId={decodeURIComponent(symbol ?? "")} current={current as TokenTabId} />
      <TabSkeleton />
    </div>
  )
}
