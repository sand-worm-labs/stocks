import type { Metadata } from "next"

import { PageHeader } from "@/components/PageHeader/PageHeader"
import { NewPortfolioButton } from "@/components/Portfolios/NewPortfolioButton"
import { PortfolioTable } from "@/components/Portfolios/PortfolioTable"
import { SearchInput } from "@/components/SearchInput/SearchInput"
import { searchPortfolios } from "@/lib/portfolios/portfolio"
import { getPortfolios } from "@/lib/portfolios/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Portfolios" }

type PortfoliosPageProps = { searchParams: Promise<{ q?: string }> }

export default async function PortfoliosPage({ searchParams }: PortfoliosPageProps) {
  const { q = "" } = await searchParams
  const [session, portfolios] = await Promise.all([getSession(), getPortfolios()])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My portfolios" actions={<NewPortfolioButton />} />
      <SearchInput param="q" label="Search portfolios" placeholder="Search portfolios..." />
      <PortfolioTable portfolios={searchPortfolios(portfolios, q)} mode={session.network.mode} />
    </div>
  )
}
