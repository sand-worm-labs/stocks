import { renderToReadableStream } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { LiveMarketProvider } from "@/components/Markets/LiveMarket"
import { AppShell } from "@/components/Shell/AppShell"
import { getSession } from "@/lib/session/source"

import HomePage from "./(home)/page"
import ActivityPage from "./activity/page"
import MarketsPage from "./markets/(list)/page"
import StockPage from "./markets/[symbol]/page"
import MarketSummaryPage from "./markets/summary/page"
import SettingsPage from "./settings/page"
import PortfoliosPage from "./strategies/(list)/page"

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
