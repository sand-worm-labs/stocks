import { PageHeader } from "@/components/PageHeader/PageHeader"
import { Card } from "@/components/ui/card"

import { SECTIONS } from "@/constants/components/skeleton/settings-skeleton"
import { Skeleton, SkeletonText } from "./Skeleton"

function SettingRowSkeleton() {
  return (
    <div className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-4 border-t p-4 first:border-t-0">
      <div className="flex min-w-0 flex-col">
        <SkeletonText lineHeight={24} className="w-44" />
        <SkeletonText lineHeight={20} className="w-72 max-w-full" />
      </div>
      <Skeleton className="h-10 w-28 flex-none rounded-full" />
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeader title="Settings" />
      {SECTIONS.map((rows, section) => (
        <section key={section} className="flex flex-col gap-3">
          <div>
            <SkeletonText lineHeight={28} className="w-48" />
            <SkeletonText lineHeight={20} className="w-80 max-w-full" />
          </div>
          <Card>
            {Array.from({ length: rows }, (_, i) => (
              <SettingRowSkeleton key={i} />
            ))}
          </Card>
        </section>
      ))}
    </div>
  )
}
