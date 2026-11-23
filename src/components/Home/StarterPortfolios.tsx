import { StarterCard } from "@/components/Onboarding/StarterCard"
import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { routeHref } from "@/config/routes"
import type { Starter } from "@/lib/onboarding/types"

// Briefs ready to start from, each opening the new portfolio with its brief already written
export function StarterPortfolios({ starters }: { starters: Starter[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Or start from a ready-made portfolio" meta="Backtested over the last year" />
      <div className="grid gap-4 md:grid-cols-3">
        {starters.map((starter, index) => (
          <StarterCard
            key={starter.id}
            starter={starter}
            index={index}
            href={routeHref("brief", { starter: starter.id }) ?? "/portfolios/new"}
          />
        ))}
      </div>
    </section>
  )
}
