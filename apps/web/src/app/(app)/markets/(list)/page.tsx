import type { Metadata } from "next"

import { FilterMenu } from "@/components/FilterMenu/FilterMenu"
import { CategoryChips } from "@/components/Markets/CategoryChips"
import { MarketHighlights } from "@/components/Markets/MarketHighlights"
import { MarketTabs } from "@/components/Markets/MarketTabs"
import { TokenTable } from "@/components/Markets/TokenTable"
import { TradeTape } from "@/components/Markets/TradeTape"
import { Reveal } from "@/components/Reveal/Reveal"
import { SearchInput } from "@/components/SearchInput/SearchInput"
import { ALL_TOKENS, categoryCounts, filterByCategory, parseCategory } from "@/lib/markets/categories"
import { getCategories } from "@/lib/markets/source"
import { ALL_ISSUERS, filterByIssuer, getBaseTokens, issuerCounts, searchTokens } from "@/lib/markets/tokens"

export const metadata: Metadata = { title: "Markets" }

type MarketsPageProps = { searchParams: Promise<{ issuer?: string; q?: string; category?: string }> }

export default async function MarketsPage({ searchParams }: MarketsPageProps) {
  const { issuer: issuerParam, q = "", category: categoryParam } = await searchParams
  const [tokens, categories] = await Promise.all([getBaseTokens(), getCategories()])
  const issuers = issuerCounts(tokens)
  const category = parseCategory(
    categoryParam,
    categoryCounts(tokens, categories).map(({ id }) => id)
  )
  const issuer = issuers.some((option) => option.issuer === issuerParam) ? (issuerParam as string) : ALL_ISSUERS

  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">Markets</h1>
        <MarketTabs current="markets" />
        <Reveal index={2}>
          <TradeTape tokens={tokens.map(({ address, symbol, image }) => ({ address, symbol, image }))} />
        </Reveal>
        <Reveal index={3}>
          <MarketHighlights tokens={tokens} />
        </Reveal>
        <CategoryChips
          tokens={tokens}
          categories={categories}
          active={category}
          keep={{ ...(q && { q }), ...(issuer !== ALL_ISSUERS && { issuer }) }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput param="q" label="Search tokenized stocks" placeholder="Search symbol or company..." />
          <FilterMenu
            route="markets"
            param="issuer"
            active={issuer}
            defaultValue={ALL_ISSUERS}
            keep={{ ...(q && { q }), ...(category !== ALL_TOKENS && { category }) }}
            options={[
              { value: ALL_ISSUERS, label: "All issuers", count: tokens.length },
              ...issuers.map(({ issuer, count }) => ({ value: issuer, label: issuer, count })),
            ]}
          />
        </div>
        <Reveal index={4}>
          <TokenTable tokens={searchTokens(filterByIssuer(filterByCategory(tokens, category, categories), issuer), q)} />
        </Reveal>
      </div>
    </>
  )
}
