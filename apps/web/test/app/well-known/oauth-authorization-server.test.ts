// @vitest-environment node
import { describe, expect, it } from "vitest"

import { GET as metadata } from "@/app/.well-known/oauth-authorization-server/route"

const read = async (response: Response) => (await response.json()) as Record<string, string>

describe("what an agent reads to find out how to connect", () => {
  it("names where this app is, and that a proof key is needed", async () => {
    const body = await read(metadata(new Request("https://stocks.example/.well-known/oauth-authorization-server")))
    expect(body).toMatchObject({
      issuer: "https://stocks.example",
      authorization_endpoint: "https://stocks.example/oauth/authorize",
      token_endpoint: "https://stocks.example/api/oauth/token",
      registration_endpoint: "https://stocks.example/api/oauth/register",
      code_challenge_methods_supported: ["S256"],
    })
  })

  it("follows the forwarded host when the app is behind a proxy", async () => {
    const request = new Request("http://internal:3000/.well-known/oauth-authorization-server", { headers: { "x-forwarded-host": "stocks.example", "x-forwarded-proto": "https" } })
    expect((await read(metadata(request))).issuer).toBe("https://stocks.example")
  })
})
