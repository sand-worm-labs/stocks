import { describe, expect, it } from "vitest"

import { identify, ProviderUnavailableError } from "./identity"
import { AUTH_PROVIDERS } from "./providers"

describe("identify", () => {
  it("does not let anyone in with Sandworm until it is connected", async () => {
    expect(AUTH_PROVIDERS.sandworm.available).toBe(false)
    await expect(identify("sandworm", "anything")).rejects.toBeInstanceOf(ProviderUnavailableError)
  })

  it("refuses a wallet sign-in that can't be checked", async () => {
    await expect(identify("wallet", "not-a-token")).rejects.toThrow()
  })
})
