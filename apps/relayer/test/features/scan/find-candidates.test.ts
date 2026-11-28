import type { Address } from "viem"
import { describe, expect, it } from "vitest"
import type { Creation } from "../../../src/infrastructure/base-mainnet/exchanges.js"
import { findCandidates } from "../../../src/features/scan/find-candidates.js"
import { addressOf } from "../../support/addresses.js"

function creation(token0: Address, token1: Address): Creation {
  return { kind: "uniswap-v3", id: "0x01", token0, token1, tickSpacing: 60, fee: 3000, hooks: undefined, block: 1n, createdBy: addressOf(7), contract: addressOf(9), asPool: (name) => ({ name, address: addressOf(9), kind: "uniswap-v3" }) }
}

describe("findCandidates", () => {
  it("keeps the pools that hold a stock, with the stock's side and what it trades against", () => {
    const stock = addressOf(1)
    const quote = addressOf(2)
    const candidates = findCandidates([creation(stock, quote), creation(quote, stock), creation(addressOf(3), addressOf(4))], new Set([stock]))

    expect(candidates.map(({ stock, quote, isStockToken0 }) => [stock, quote, isStockToken0])).toEqual([
      [stock, quote, true],
      [stock, quote, false],
    ])
  })

  it("matches addresses whatever their case", () => {
    const stock = addressOf(0xab)
    const checksummed = stock.toUpperCase().replace("0X", "0x") as Address
    expect(findCandidates([creation(checksummed, addressOf(2))], new Set([stock]))).toHaveLength(1)
  })

  it("makes a pool of two stocks a candidate for both", () => {
    const a = addressOf(1)
    const b = addressOf(2)
    expect(findCandidates([creation(a, b)], new Set([a, b])).map(({ stock }) => stock)).toEqual([a, b])
  })
})
