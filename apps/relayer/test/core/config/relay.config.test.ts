import { describe, expect, it } from "vitest"
import { readRelayConfig } from "../../../src/core/config/relay.config.js"

const base = {
  MAINNET_RPC_URL: "https://example.com/mainnet",
  TESTNET_RPC_URL: "https://example.com/testnet",
  MIRROR_ADDRESS: "0x00000000000000000000000000000000000000a1",
}

describe("readRelayConfig", () => {
  it("defaults to a dry run that needs no key", () => {
    const config = readRelayConfig(base)
    expect(config.isDryRun).toBe(true)
    expect(config.privateKey).toBeUndefined()
  })

  it("refuses a live run without a key", () => {
    expect(() => readRelayConfig({ ...base, DRY_RUN: "false" })).toThrow("RELAYER_PRIVATE_KEY")
  })

  it("refuses an address that is not one", () => {
    expect(() => readRelayConfig({ ...base, MIRROR_ADDRESS: "nope" })).toThrow()
  })
})

describe("readRelayConfig, finding pools", () => {
  const api = { STOCKS_API_URL: "http://stocks.test/", STOCKS_API_KEY: "secret" }

  it("reads the pools from the file unless told to discover them", () => {
    expect(readRelayConfig(base).isDiscovering).toBe(false)
    expect(readRelayConfig({ ...base, ...api, DISCOVER_POOLS: "true" }).isDiscovering).toBe(true)
  })

  it("needs the Stocks API to discover them, since that is where the stocks and their pools are found", () => {
    expect(() => readRelayConfig({ ...base, DISCOVER_POOLS: "true" })).toThrow("STOCKS_API_URL")
  })

  it("keeps the API's address without a closing slash, with its key", () => {
    expect(readRelayConfig({ ...base, ...api }).stocksApi).toEqual({ url: "http://stocks.test", key: "secret" })
  })
})
