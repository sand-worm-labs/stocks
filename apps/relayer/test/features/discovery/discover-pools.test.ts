import { describe, expect, it } from "vitest"
import { discoverPools } from "../../../src/features/discovery/discover-pools.js"
import { addressOf } from "../../support/addresses.js"

const api = { url: "http://stocks.test", key: "secret" }

describe("discoverPools", () => {
  it("asks the Stocks API for the stocks, with the shared key, and keeps the pools it can read", async () => {
    const asked: { url: string; authorization: string | null }[] = []
    const send = (async (input: string | URL | Request, init?: RequestInit) => {
      asked.push({ url: String(input), authorization: new Headers(init?.headers).get("authorization") })
      return Response.json([{ symbol: "S1c", address: addressOf(1), price: 10, liquidity: 5, pool: { address: addressOf(101), dex: "aero", quote: addressOf(9) } }])
    }) as typeof fetch

    const { pools } = await discoverPools(api, send)

    expect(pools.map(({ name, address, kind }) => [name, address, kind])).toEqual([["S1c", addressOf(101), "aerodrome-cl"]])
    expect(asked).toEqual([{ url: "http://stocks.test/market/stocks", authorization: "Bearer secret" }])
  })

  it("fails loudly when the API does not answer, so a bad round is not a silent empty list", async () => {
    await expect(discoverPools(api, (async () => new Response("", { status: 503 })) as typeof fetch)).rejects.toThrow("503")
  })
})
