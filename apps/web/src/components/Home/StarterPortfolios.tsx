import { StarterCard } from "@/components/Onboarding/StarterCard"
import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { routeHref } from "@/config/routes"
import type { Starter } from "@/types/onboarding"

export function StarterPortfolios({ starters }: { starters: Starter[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Or start from a ready-made strategy" meta="Backtested over the last year" />
      <div className="grid gap-4 md:grid-cols-3">
        {starters.map((starter, index) => (
          <StarterCard
            key={starter.id}
            starter={starter}
            index={index}
            href={routeHref("brief", { starter: starter.id }) ?? "/strategies/new"}
          />
        ))}
      </div>
    </section>
  )
}
