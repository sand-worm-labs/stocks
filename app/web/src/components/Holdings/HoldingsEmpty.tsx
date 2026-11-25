import { EmptyState } from "@/components/ui/empty-state"
import { CREATE_STRATEGY } from "@/constants/empty-state"

export function HoldingsEmpty() {
  return (
    <EmptyState
      icon="holdings"
      title="No holdings yet"
      description="The stocks your strategies buy will show up here."
      primary={CREATE_STRATEGY}
    />
  )
}
