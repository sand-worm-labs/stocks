import { describe, expect, it } from "vitest"
import { explorerLink } from "../../../src/features/scan/measure-pools.js"
import { addressOf } from "../../support/addresses.js"

describe("explorerLink", () => {
  it("points at the contract's page on the explorer", () => {
    expect(explorerLink(addressOf(0xab))).toBe(`https://basescan.org/address/${addressOf(0xab)}`)
  })
})
