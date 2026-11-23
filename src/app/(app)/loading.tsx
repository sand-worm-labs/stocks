import { PageSkeleton } from "@/components/Skeleton/PageSkeleton"

// Shown the instant a link is clicked, while the next page is read on the server. Without it the old page stays put
// until the new one is whole, and a click feels like it did nothing.
export default function Loading() {
  return <PageSkeleton />
}
