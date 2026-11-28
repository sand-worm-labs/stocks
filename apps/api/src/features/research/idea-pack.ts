import { type Market } from "@/features/market/matching/find-stocks"
import { marketPackFor, type MarketPack } from "@/features/market/matching/market-pack"
import { namedBy } from "@/features/strategies/brief/idea-coverage"

/// What the market on Base holds for an idea: the stocks it is about, found by what they are and not by a list kept by hand
export function packForIdea(brief: string, market: Market): MarketPack {
  return marketPackFor(namedBy(brief), market)
}

// Where the research gets it from: the market as it stands, when it is asked for
export type PackFor = (brief: string) => Promise<MarketPack>

export const createPackFor = (market: () => Promise<Market>): PackFor => async (brief) => packForIdea(brief, await market())
