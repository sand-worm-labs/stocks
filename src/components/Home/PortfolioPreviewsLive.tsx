"use client"

import { useLivePortfolios } from "@/components/Portfolios/useLivePortfolios"
import type { Portfolio } from "@/lib/portfolios/types"
import type { Session } from "@/lib/session/types"

import { PortfolioPreviews } from "./PortfolioPreviews"

// The model cards, each at its live value, and in the order of what each is worth now
export function PortfolioPreviewsLive({
  portfolios,
  addresses,
  mode,
}: {
  portfolios: Portfolio[]
  addresses: Record<string, string>
  mode: Session["network"]["mode"]
}) {
  return <PortfolioPreviews portfolios={useLivePortfolios(portfolios, addresses)} mode={mode} />
}
