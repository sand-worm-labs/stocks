import { afterEach, describe, expect, it, vi } from "vitest"

import { GET } from "./route"

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("is fine without the API, where strategies are kept in a file", async () => {
    vi.stubEnv("STOCKS_API_URL", "")
    expect((await GET()).status).toBe(200)
  })

  it("is fine when the API answers", async () => {
    vi.stubEnv("STOCKS_API_URL", "http://api.test")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }))
    expect((await GET()).status).toBe(200)
  })

  it("is a 503 when the API does not", async () => {
    vi.stubEnv("STOCKS_API_URL", "http://api.test")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 503 }))
    expect((await GET()).status).toBe(503)

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("connection refused"))
    expect((await GET()).status).toBe(503)
  })
})
