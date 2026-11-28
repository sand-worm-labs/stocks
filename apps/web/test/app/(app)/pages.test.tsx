import { renderToReadableStream } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"


import HomePage from "@/app/(app)/(home)/page"
import ActivityPage from "@/app/(app)/activity/page"
import MarketsPage from "@/app/(app)/markets/(list)/page"
import StockPage from "@/app/(app)/markets/[symbol]/page"
import MarketSummaryPage from "@/app/(app)/markets/summary/page"
import SettingsPage from "@/app/(app)/settings/page"
import PortfoliosPage from "@/app/(app)/strategies/(list)/page"
import { LiveMarketProvider } from "@/components/Markets/LiveMarket"
import { AppShell } from "@/components/Shell/AppShell"
import { getSession } from "@/lib/session/source"

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

// These screens are drawn from the made-up data, which is what a person gets when they ask for it in Settings
vi.mock("@/lib/demo/source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/demo/source")>()),
  getModelCount: async () => 40,
}))

vi.mock("next/font/local", () => ({ default: () => ({ className: "font-test" }) }))

vi.mock("@/lib/markets/tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/markets/tokens")>()),
  getBaseTokens: async () => [token("NVDAc", "NVIDIA", 1), token("AAPLc", "Apple", 2), token("SNDKc", "SanDisk", 3)],
}))

// What the Stocks API says about the stocks: a small market of its own, with research notes only on NVIDIA
const STOCKS = [
  { symbol: "NVDAc", name: "NVIDIA Corporation", price: 150, liquidity: 2_000_000, sector: "Technology", industry: "Semiconductors" },
  { symbol: "AAPLc", name: "Apple Inc.", price: 355, liquidity: 570_000, sector: "Technology", industry: "Consumer Electronics" },
  { symbol: "SNDKc", name: "Sandisk Corporation", price: 73, liquidity: 313_000, sector: "Technology", industry: "Computer Hardware" },
]
const SOURCE = { name: "base.org", url: "https://docs.base.org/sdks/tokenized-stocks/overview", title: "Base · tokenized stocks" }
const NVIDIA_NOTES = {
  knowledge: [
    {
      id: "robotics-revenue",
      kind: "fact" as const,
      text: "Automotive & robotics was $604M of $68.1B revenue in Q4 FY26.",
      source: { name: "verdict.co.uk", url: "https://www.verdict.co.uk/nvidia-q4-fy26-results/", title: "NVIDIA Q4 FY26 results" },
    },
  ],
  risk: { beta: 1.8, worstDrop: -0.37 },
}

vi.mock("@/lib/markets/source", () => ({
  getStocks: async () => STOCKS,
  getCategories: async () => [],
  getMarketSummary: async () => ({ listed: 3, buyable: 3, asOf: "2026-11-26T00:00:00Z", source: SOURCE }),
  getStockDetail: async (symbol: string) => {
    const stock = STOCKS.find((found) => found.symbol === symbol)
    const detail = { issuer: "Coinbase · B20", ownership: "Price exposure, no votes", tradingHours: "24/7", sources: [SOURCE], knowledge: [], ...(symbol === "NVDAc" ? NVIDIA_NOTES : {}) }
    return stock ? { stock, detail } : undefined
  },
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const render = async (page: Promise<React.ReactElement>) => {
  const stream = await renderToReadableStream(
    <LiveMarketProvider>
      <AppShell session={await getSession()}>{await page}</AppShell>
    </LiveMarketProvider>
  )
  await stream.allReady

  return (await new Response(stream).text()).replaceAll("<!-- -->", "")
}

describe("app screens", () => {
  it("renders the home screen from the mock data", async () => {
    const html = await render(HomePage())

    expect(html).toContain("GM")
    expect(html).toContain("Emmanuel")
    expect(html).toContain("Total value")
    expect(html).toContain("Continue")
    expect(html).toContain("What the agent did")
  })

  it("renders the portfolios with a live summary, and narrows them by a search", async () => {
    const all = await render(PortfoliosPage({ searchParams: Promise.resolve({}) }))
    const robotics = await render(PortfoliosPage({ searchParams: Promise.resolve({ q: "robotics" }) }))
    const chips = await render(PortfoliosPage({ searchParams: Promise.resolve({ q: "chips" }) }))

    expect(all).toContain("Total value")
    expect(all).toContain("Most profitable")
    expect(robotics).toContain("Robotics, capped at 20%")
    expect(chips).toContain("AI chips, max 25%")
    expect(chips).toContain("Results ready")
    expect(chips).not.toContain("Robotics, capped at 20%")
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

  it("renders the activity grouped by day, with no refusals filter until the agent can refuse something", async () => {
    const all = await render(ActivityPage({ searchParams: Promise.resolve({}) }))
    const asked = await render(ActivityPage({ searchParams: Promise.resolve({ filter: "refusals" }) }))

    expect(all).toContain("Yesterday")
    expect(all).toContain("Bought NVDAc")
    expect(all).not.toContain("Refusals")
    // Asking for it anyway shows everything rather than an empty list
    expect(asked).toContain("Bought NVDAc")
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
