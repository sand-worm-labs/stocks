import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { SHOWN } from "@/constants/components/home/portfolio-previews"
import { pluralize } from "@/lib/format"
import { rankByValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/types/portfolios"
import type { Session } from "@/types/session"

import { NewPortfolioCard } from "./NewPortfolioCard"
import { PortfolioPreviewCard } from "./PortfolioPreviewCard"

export function PortfolioPreviews({ portfolios, mode }: { portfolios: Portfolio[]; mode: Session["network"]["mode"] }) {
  const ranked = rankByValue(portfolios)
  const drafts = portfolios.filter(({ status }) => status === "draft").length
  const meta = [pluralize(ranked.length, "live strategy"), drafts ? pluralize(drafts, "draft") : ""]
    .filter(Boolean)
    .join(" · ")

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Your strategies" meta={meta} link={{ route: "portfolios", label: "See all →" }} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ranked.slice(0, SHOWN).map((portfolio, index) => (
          <PortfolioPreviewCard key={portfolio.id} portfolio={portfolio} index={index} mode={mode} />
        ))}
        <NewPortfolioCard />
      </div>
    </section>
  )
}
