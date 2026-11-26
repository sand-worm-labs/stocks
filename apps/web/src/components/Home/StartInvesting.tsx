import { EmptyState } from "@/components/ui/empty-state"
import { CREATE_STRATEGY, LOOK_AROUND } from "@/constants/empty-state"

export function StartInvesting() {
  return (
    <EmptyState
      icon="portfolio"
      title="Start investing with Sandworm"
      description="Say what you want. The agent researches it and builds a strategy you can check before you buy."
      primary={CREATE_STRATEGY}
      secondary={LOOK_AROUND}
      className="min-h-[26rem] justify-center py-14"
    />
  )
}
