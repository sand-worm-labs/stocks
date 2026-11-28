import { zeroAddress, type Address } from "viem"
import { describe, expect, it } from "vitest"
import { findTickSpacing, inAddressOrder, poolIdOf } from "../../../src/features/provision/v4-key.js"

const low = "0x1111111111111111111111111111111111111111" as Address
const high = "0x2222222222222222222222222222222222222222" as Address

describe("findTickSpacing", () => {
  it("finds the spacing a pool id was made with", () => {
    const poolId = poolIdOf(low, high, 3000, 60, zeroAddress)
    expect(findTickSpacing(poolId, low, high, 3000)).toBe(60)
  })

  it("finds a spacing that is not one of the usual", () => {
    const poolId = poolIdOf(low, high, 9000, 90, zeroAddress)
    expect(findTickSpacing(poolId, low, high, 9000)).toBe(90)
  })

  it("finds nothing for a pool with hooks, or for the wrong fee", () => {
    const withHooks = poolIdOf(low, high, 3000, 60, "0x00000000000000000000000000000000000000f0")
    expect(findTickSpacing(withHooks, low, high, 3000)).toBeUndefined()

    const plain = poolIdOf(low, high, 3000, 60, zeroAddress)
    expect(findTickSpacing(plain, low, high, 500)).toBeUndefined()
  })
})

describe("inAddressOrder", () => {
  it("puts the lower address first whichever way round it is given", () => {
    expect(inAddressOrder(high, low)).toEqual([low, high])
    expect(inAddressOrder(low, high)).toEqual([low, high])
  })

  it("compares addresses by value, not by how they are cased", () => {
    const upper = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" as Address
    expect(inAddressOrder(upper, high)).toEqual([high, upper])
  })
})
