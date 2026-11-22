import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import type { Portfolio } from "@/lib/portfolios/types"

import { NewPortfolioCard } from "./NewPortfolioCard"
import { PortfolioPreviewCard } from "./PortfolioPreviewCard"

export function PortfolioPreviews({ portfolios }: { portfolios: Portfolio[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Your portfolios" link={{ route: "portfolios", label: "See all →" }} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {portfolios
          .filter(({ status }) => status !== "unbuildable")
          .map((portfolio) => (
            <PortfolioPreviewCard key={portfolio.id} portfolio={portfolio} />
          ))}
        <NewPortfolioCard />
      </div>
    </section>
  )
}
