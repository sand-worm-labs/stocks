
import { identify } from "@/features/auth/dynamic/identity"

describe("identify", () => {
  it("refuses a sign-in that can't be checked", async () => {
    await expect(identify("not-a-token")).rejects.toThrow()
  })
})
