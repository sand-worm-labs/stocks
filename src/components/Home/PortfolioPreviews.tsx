import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { pluralize } from "@/lib/format"
import { rankByValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"
import type { Session } from "@/lib/session/types"

import { NewPortfolioCard } from "./NewPortfolioCard"
import { PortfolioPreviewCard } from "./PortfolioPreviewCard"

// As many cards as fit two rows beside the "new portfolio" one; the rest are a click away
const SHOWN = 5

// The biggest models as cards, with how many there are in all, and the drafts waiting counted
export function PortfolioPreviews({ portfolios, mode }: { portfolios: Portfolio[]; mode: Session["network"]["mode"] }) {
  const ranked = rankByValue(portfolios)
  const drafts = portfolios.filter(({ status }) => status === "draft").length
  const meta = [pluralize(ranked.length, "live model"), drafts ? pluralize(drafts, "draft") : ""]
    .filter(Boolean)
    .join(" · ")

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Your portfolios" meta={meta} link={{ route: "portfolios", label: "See all →" }} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ranked.slice(0, SHOWN).map((portfolio, index) => (
          <PortfolioPreviewCard key={portfolio.id} portfolio={portfolio} index={index} mode={mode} />
        ))}
        <NewPortfolioCard />
      </div>
    </section>
  )
}
