import type { Metadata } from "next"

import { PageHeader } from "@/components/PageHeader/PageHeader"
import { NewPortfolioButton } from "@/components/Portfolios/NewPortfolioButton"
import { PortfoliosLive } from "@/components/Portfolios/PortfoliosLive"
import { getHeldAddresses } from "@/lib/portfolios/addresses"
import { searchPortfolios } from "@/lib/portfolios/portfolio"
import { getPortfolios } from "@/lib/portfolios/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Portfolios" }

type PortfoliosPageProps = { searchParams: Promise<{ q?: string }> }

export default async function PortfoliosPage({ searchParams }: PortfoliosPageProps) {
  const { q = "" } = await searchParams
  const [session, portfolios] = await Promise.all([getSession(), getPortfolios()])
  const addresses = await getHeldAddresses(portfolios)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My portfolios" actions={<NewPortfolioButton />} />
      <PortfoliosLive portfolios={searchPortfolios(portfolios, q)} addresses={addresses} mode={session.network.mode} />
    </div>
  )
}
