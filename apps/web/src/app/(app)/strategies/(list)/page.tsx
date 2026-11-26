import type { Metadata } from "next"

import Link from "next/link"

import { PageHeader } from "@/components/PageHeader/PageHeader"
import { NewPortfolioButton } from "@/components/Portfolios/NewPortfolioButton"
import { PortfoliosLive } from "@/components/Portfolios/PortfoliosLive"
import { getHeldAddresses } from "@/lib/portfolios/addresses"
import { searchPortfolios } from "@/lib/portfolios/portfolio"
import { getPortfolios } from "@/lib/portfolios/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Strategies" }

type PortfoliosPageProps = { searchParams: Promise<{ q?: string }> }

export default async function PortfoliosPage({ searchParams }: PortfoliosPageProps) {
  const { q = "" } = await searchParams
  const [session, portfolios] = await Promise.all([getSession(), getPortfolios()])
  const addresses = await getHeldAddresses(portfolios)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon="portfolio" title="My strategies" actions={
          <div className="flex items-center gap-4">
            <Link href="/strategies/trash" className="text-ink-400 hover:text-ink-100 text-sm">
              Trash
            </Link>
            <NewPortfolioButton />
          </div>
        } />
      <PortfoliosLive
        portfolios={searchPortfolios(portfolios, q)}
        addresses={addresses}
        mode={session.network.mode}
        searching={q.trim() !== ""}
      />
    </div>
  )
}
