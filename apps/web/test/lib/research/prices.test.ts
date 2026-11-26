// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ResearchFailure } from "@/lib/research/failure"
import { getDailyPrices, shareOf } from "@/lib/research/prices"

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe("daily prices for research", () => {
  beforeEach(() => {
    vi.stubEnv("STOCKS_API_URL", "http://api.test")
    vi.stubEnv("STOCKS_API_KEY", "secret")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("gives what the API worked out, asking for the tickers and the years", async () => {
    const prices = { dates: ["2024-01-02"], closes: { AAPL: [100], SPY: [400] } }
    const send = vi.fn().mockResolvedValue(reply(prices))
    vi.stubGlobal("fetch", send)

    expect(await getDailyPrices(["AAPL", "BRK-B"], 2)).toEqual(prices)
    expect(String(send.mock.calls[0]?.[0])).toBe("http://api.test/market/daily-prices?tickers=AAPL,BRK-B&years=2")
  })

  it("tells the person why a stock can't be tested, in the API's own words", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ statusCode: 422, message: "NEW has too little price history to test (50 days)" }, 422)))

    const failure = await getDailyPrices(["NEW"]).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(ResearchFailure)
    expect((failure as Error).message).toBe("NEW has too little price history to test (50 days)")
  })

  it("says plainly when the API can't be reached or answers badly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")))
    await expect(getDailyPrices(["AAPL"])).rejects.toThrow("could not be reached")

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 502 })))
    await expect(getDailyPrices(["AAPL"])).rejects.toThrow("could not be fetched (502)")
  })

  it("says when there is no API to ask", async () => {
    vi.stubEnv("STOCKS_API_URL", "")
    await expect(getDailyPrices(["AAPL"])).rejects.toBeInstanceOf(ResearchFailure)
  })

  it("follows a share, so AMZNc is AMZN and BRK.B is BRK-B", () => {
    expect(shareOf("AMZNc")).toBe("AMZN")
    expect(shareOf("BRK.Bc")).toBe("BRK-B")
  })
})
