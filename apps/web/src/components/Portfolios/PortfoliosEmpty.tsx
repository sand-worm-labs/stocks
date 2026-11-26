import { EmptyState } from "@/components/ui/empty-state"
import { CREATE_STRATEGY } from "@/constants/empty-state"

export function PortfoliosEmpty() {
  return (
    <EmptyState
      icon="portfolio"
      title="No strategies yet"
      description="Describe what you want to invest in and we'll turn it into a strategy."
      primary={CREATE_STRATEGY}
    />
  )
}
