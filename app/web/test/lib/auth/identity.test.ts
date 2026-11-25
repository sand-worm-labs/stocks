import { describe, expect, it } from "vitest"

import { identify } from "@/lib/auth/identity"

describe("identify", () => {
  it("refuses a sign-in that can't be checked", async () => {
    await expect(identify("not-a-token")).rejects.toThrow()
  })
})
