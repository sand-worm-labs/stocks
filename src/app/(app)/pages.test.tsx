import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { LiveMarketProvider } from "@/components/Markets/LiveMarket"
import { AppShell } from "@/components/Shell/AppShell"
import { getSession } from "@/lib/session/source"

import ActivityPage from "./activity/page"
import StockPage from "./markets/[symbol]/page"
import MarketsPage from "./markets/page"
import MarketSummaryPage from "./markets/summary/page"
import HomePage from "./page"
import PortfoliosPage from "./portfolios/page"
import SettingsPage from "./settings/page"

const token = (symbol: string, company: string, rank: number) => ({
  id: `${company.toLowerCase()}-coinbase-tokenized-stock`,
  symbol,
  company,
  issuer: "Coinbase",
  address: "0x1111111111111111111111111111111111111111",
  price: 100 + rank,
  marketCap: 1_000_000 / rank,
  volume: 20_000,
  rank,
  change24h: 0.01,
  change7d: -0.02,
  series: [1, 2, 3],
})

vi.mock("@/lib/markets/tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/markets/tokens")>()),
  getBaseTokens: async () => [token("NVDAc", "NVIDIA", 1), token("AAPLc", "Apple", 2), token("SNDKc", "SanDisk", 3)],
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const render = async (page: Promise<React.ReactElement>) =>
  renderToStaticMarkup(
    <LiveMarketProvider>
      <AppShell session={await getSession()}>{await page}</AppShell>
    </LiveMarketProvider>
  )

describe("app screens", () => {
  it("renders the home screen from the mock data", async () => {
    const html = await render(HomePage())

    expect(html).toContain("Good afternoon, Emmanuel")
    expect(html).toContain("504.21")
    expect(html).toContain("Needs you")
    expect(html).toContain("What the agent did")
  })

  it("renders every portfolio with its status", async () => {
    const html = await render(PortfoliosPage({ searchParams: Promise.resolve({}) }))
    const searched = await render(PortfoliosPage({ searchParams: Promise.resolve({ q: "chips" }) }))

    expect(html).toContain("Robotics, capped at 20%")
    expect(html).toContain("Waiting for you to confirm rules")
    expect(searched).toContain("AI chips, max 25%")
    expect(searched).not.toContain("Robotics, capped at 20%")
  })

  it("renders every token on the markets page, and nothing when the search matches none", async () => {
    const all = await render(MarketsPage({ searchParams: Promise.resolve({}) }))
    const unmatched = await render(MarketsPage({ searchParams: Promise.resolve({ q: "zzz" }) }))

    expect(all).toContain("Live trades")
    expect(all).not.toContain("Every tokenized stock on Base")
    expect(all).toContain("NVDAc")
    expect(all).toContain("AAPLc")
    expect(unmatched).toContain("No tokenized stocks match.")
  })

  it("summarises the market, and where its value sits", async () => {
    const html = await render(MarketSummaryPage())

    expect(html).toContain("Market summary")
    expect(html).toContain("Where the market cap sits")
    expect(html).toContain("Who issues the market")
    expect(html).toContain("Coinbase")
  })

  it("renders a token from its symbol, with the research notes it has", async () => {
    const html = await render(
      StockPage({ params: Promise.resolve({ symbol: "NVDAc" }), searchParams: Promise.resolve({}) })
    )

    expect(html).toContain("NVIDIA")
    expect(html).toContain("Robotics, capped at 20%")
    expect(html).toContain("verdict.co.uk")
    expect(html).toContain("Beta 1.8")
  })

  it("leaves out the research cards when nothing has been researched about a token", async () => {
    const html = await render(
      StockPage({ params: Promise.resolve({ symbol: "AAPLc" }), searchParams: Promise.resolve({}) })
    )

    expect(html).not.toContain("What the agent knows")
    expect(html).not.toContain("Risk in one line")
  })

  it("has a tab for the live trades, the community and the contract", async () => {
    const page = (tab: string) =>
      render(StockPage({ params: Promise.resolve({ symbol: "NVDAc" }), searchParams: Promise.resolve({ tab }) }))

    expect(await page("stats")).toContain("Token contract")
    expect(await page("stats")).toContain("Number 1 of 3 on Base")
    expect(await page("trades")).toContain("Bought")
    expect(await page("community")).toContain("NVDAc chat")
    expect(await page("contract")).toContain("0x1111111111111111111111111111111111111111")
    expect(await page("info")).toContain("CoinGecko")
  })

  it("has no page for a token that isn't listed", async () => {
    await expect(
      StockPage({ params: Promise.resolve({ symbol: "ISRG" }), searchParams: Promise.resolve({}) })
    ).rejects.toThrow()
  })

  it("renders the activity grouped by day, and only refusals when asked", async () => {
    const all = await render(ActivityPage({ searchParams: Promise.resolve({}) }))
    const refusals = await render(ActivityPage({ searchParams: Promise.resolve({ filter: "refusals" }) }))

    expect(all).toContain("Yesterday")
    expect(all).toContain("Bought NVDAc")
    expect(refusals).toContain("Refused a trade")
    expect(refusals).not.toContain("Bought NVDAc")
  })

  it("renders every settings section", async () => {
    const html = await render(SettingsPage())

    for (const section of [
      "Account",
      "Wallet and trading",
      "Your risk profile",
      "Notifications",
      "Use it from your AI app",
    ]) {
      expect(html).toContain(section)
    }
  })
})
