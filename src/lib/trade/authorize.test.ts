// @vitest-environment node
import { type Hex, verifyMessage } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { describe, expect, it } from "vitest"

import { APPROVAL_WINDOW_MS, approvalMessage, type Chain, verifyApproval } from "./authorize"

const owner = privateKeyToAccount(generatePrivateKey())
const other = privateKeyToAccount(generatePrivateKey())
const NOW = new Date("2026-11-24T12:00:00.000Z")
const expires = new Date(NOW.getTime() + 10 * 60 * 1000).toISOString()

const chain = (balance: number | "fails" = 1000): Chain => ({
  verifyMessage: (args) => verifyMessage(args),
  usdcBalance: async () => (balance === "fails" ? Promise.reject(new Error("rpc down")) : balance),
})
const approval = { strategyId: "robotics-1", address: owner.address as Hex, limit: 400, expires }
const sign = (account = owner, changes: Partial<typeof approval> = {}) =>
  account.signMessage({ message: approvalMessage({ ...approval, ...changes }) })
const check = async (changes: Partial<typeof approval> = {}, signature?: Hex, c = chain()) =>
  verifyApproval(c, { ...approval, ...changes, signature: signature ?? (await sign()) }, NOW)

describe("approving a strategy to trade from a wallet", () => {
  it("accepts the wallet owner's signature of these words while the wallet holds the USDC, and says what it holds", async () => {
    expect(await check()).toBe(1000)
    expect(await check({}, undefined, chain(400))).toBe(400)
  })

  it("says in plain words what is being approved, and that nothing is sent", () => {
    const words = approvalMessage(approval)
    expect(words).toContain("strategy robotics-1")
    expect(words).toContain("up to 400.00 USDC")
    expect(words).toContain(owner.address)
    expect(words).toMatch(/Nothing is sent/)
  })

  it("refuses a wallet that holds less than the strategy needs", async () => {
    await expect(check({}, undefined, chain(399.99))).rejects.toMatchObject({
      status: 422,
      message: expect.stringMatching(/less than the 400\.00/),
    })
  })

  it("refuses an approval that has run out, or that asks for longer than allowed", async () => {
    const past = new Date(NOW.getTime() - 1000).toISOString()
    await expect(check({ expires: past }, await sign(owner, { expires: past }))).rejects.toMatchObject({ status: 422 })
    const far = new Date(NOW.getTime() + APPROVAL_WINDOW_MS + 60_000).toISOString()
    await expect(check({ expires: far }, await sign(owner, { expires: far }))).rejects.toMatchObject({ status: 422 })
    await expect(check({ expires: "tomorrow" }, await sign())).rejects.toMatchObject({ status: 422 })
  })

  it("refuses a signature from anyone but the wallet's owner", async () => {
    await expect(check({}, await sign(other))).rejects.toMatchObject({ status: 422 })
    // someone else's wallet named with their own signature
    await expect(check({ address: other.address }, await sign(owner))).rejects.toMatchObject({ status: 422 })
  })

  it("refuses a signature made for another strategy, another amount or another wallet", async () => {
    await expect(check({}, await sign(owner, { strategyId: "someone-elses" }))).rejects.toMatchObject({ status: 422 })
    await expect(check({}, await sign(owner, { limit: 10 }))).rejects.toMatchObject({ status: 422 })
  })

  it("says so, and doesn't pass, when the chain can't be read", async () => {
    await expect(check({}, undefined, chain("fails"))).rejects.toMatchObject({ status: 422 })
  })
})
