import { SettingsSkeleton } from "@/components/Skeleton/SettingsSkeleton"
import { SkeletonShell } from "@/components/Skeleton/SkeletonShell"

export default function Loading() {
  return (
    <SkeletonShell>
      <SettingsSkeleton />
    </SkeletonShell>
  )
}
