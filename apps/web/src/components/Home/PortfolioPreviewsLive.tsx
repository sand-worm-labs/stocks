"use client"

import { useLivePortfolios } from "@/components/Portfolios/useLivePortfolios"
import type { Portfolio } from "@/types/portfolios"
import type { Session } from "@/types/session"

import { PortfolioPreviews } from "./PortfolioPreviews"

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
