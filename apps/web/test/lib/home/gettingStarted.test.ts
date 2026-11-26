import { describe, expect, it } from "vitest"

import { buildGettingStarted } from "@/lib/home/gettingStarted"

const none = { walletConnected: false, hasPortfolio: false, hasBought: false }
const current = (steps: ReturnType<typeof buildGettingStarted>) => steps.find(({ current }) => current)?.id

describe("buildGettingStarted", () => {
  it("starts with the account done and the wallet next", () => {
    const steps = buildGettingStarted(none)
    expect(steps.filter(({ done }) => done).map(({ id }) => id)).toEqual(["joined"])
    expect(current(steps)).toBe("wallet")
  })

  it("moves on to the first step still not done", () => {
    expect(current(buildGettingStarted({ ...none, walletConnected: true }))).toBe("portfolio")
    expect(current(buildGettingStarted({ walletConnected: true, hasPortfolio: true, hasBought: false }))).toBe("buy")
  })

  it("has nothing next once everything is done", () => {
    expect(current(buildGettingStarted({ walletConnected: true, hasPortfolio: true, hasBought: true }))).toBeUndefined()
  })
})
