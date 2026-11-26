// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createHash } from "node:crypto"

import { GET as metadata } from "@/app/.well-known/oauth-authorization-server/route"
import { POST as approve } from "@/app/api/oauth/approve/route"
import { POST as register } from "@/app/api/oauth/register/route"
import { POST as token } from "@/app/api/oauth/token/route"
import { agentOwner } from "@/lib/auth/agent"
import { getOwnerId } from "@/lib/strategies/source"

// Who is signed in is read from the request's cookies, which a test has none of; it is stood in for as in respond's own tests
vi.mock("@/lib/strategies/source", () => ({ getOwnerId: vi.fn() }))

const OWNER = "3f9c1a52-8d41-4a3e-b7aa-0c61d2e9f845"
const REDIRECT = "https://claude.ai/api/mcp/auth_callback"
const VERIFIER = "a-long-random-secret-the-agent-made-up-for-this-one-connection-0123456789"

beforeEach(() => {
  vi.mocked(getOwnerId).mockResolvedValue(OWNER)
})

beforeAll(() => {
  process.env.AUTH_SECRET = "a-test-secret-that-is-long-enough-to-use"
  process.env.AUTH_REQUIRED = "true"
})

const read = async (response: Response) => (await response.json()) as Record<string, string>

const json = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) })

const form = (url: string, fields: Record<string, string>) =>
  new Request(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields).toString() })

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

describe("connecting an agent, from the first request to a call as the person", () => {
  it("works end to end, and the token it ends with acts as the person who allowed it", async () => {
    const registered = await register(json("https://stocks.example/api/oauth/register", { redirect_uris: [REDIRECT], client_name: "Claude" }))
    expect(registered.status).toBe(201)
    const { client_id = "" } = await read(registered)

    // The person allows it, in the app, signed in with their session
    const challenge = createHash("sha256").update(VERIFIER).digest("base64url")
    const approval = await approve(
      json("https://stocks.example/api/oauth/approve", { client_id, redirect_uri: REDIRECT, state: "s1", code_challenge: challenge, allow: true }, {
        origin: "https://stocks.example",
        host: "stocks.example",
      })
    )
    expect(approval.status).toBe(200)
    const back = new URL((await read(approval)).redirect ?? "")
    expect(back.origin + back.pathname).toBe(REDIRECT)
    expect(back.searchParams.get("state")).toBe("s1")

    // The agent swaps the code for a token
    const swapped = await token(
      form("https://stocks.example/api/oauth/token", {
        grant_type: "authorization_code",
        code: back.searchParams.get("code") ?? "",
        code_verifier: VERIFIER,
        client_id,
        redirect_uri: REDIRECT,
      })
    )
    expect(swapped.status).toBe(200)
    const { access_token = "" } = await read(swapped)

    // And the app knows who it is for
    const call = new Request("https://stocks.example/api/strategies", { headers: { authorization: `Bearer ${access_token}` } })
    expect(await agentOwner(call)).toBe(OWNER)
  })

  it("sends the browser back with an error when the person says no", async () => {
    const { client_id = "" } = await read(await register(json("https://stocks.example/api/oauth/register", { redirect_uris: [REDIRECT] })))
    const challenge = createHash("sha256").update(VERIFIER).digest("base64url")
    const answer = await approve(
      json("https://stocks.example/api/oauth/approve", { client_id, redirect_uri: REDIRECT, code_challenge: challenge, allow: false }, {
        origin: "https://stocks.example",
        host: "stocks.example",
      })
    )
    const back = new URL((await read(answer)).redirect ?? "")
    expect(back.searchParams.get("error")).toBe("access_denied")
    expect(back.searchParams.has("code")).toBe(false)
  })

  it("won't make a code for someone who isn't signed in", async () => {
    const { client_id = "" } = await read(await register(json("https://stocks.example/api/oauth/register", { redirect_uris: [REDIRECT] })))
    vi.mocked(getOwnerId).mockResolvedValue(undefined)
    const answer = await approve(
      json("https://stocks.example/api/oauth/approve", { client_id, redirect_uri: REDIRECT, code_challenge: "x".repeat(43), allow: true }, {
        origin: "https://stocks.example",
        host: "stocks.example",
      })
    )
    expect(answer.status).toBe(401)
  })

  it("won't make a code from another site", async () => {
    const answer = await approve(json("https://stocks.example/api/oauth/approve", {}, { origin: "https://evil.example", host: "stocks.example" }))
    expect(answer.status).toBe(403)
  })

  it("refuses an address the agent didn't register, even from a signed-in person", async () => {
    const { client_id = "" } = await read(await register(json("https://stocks.example/api/oauth/register", { redirect_uris: [REDIRECT] })))
    const answer = await approve(
      json("https://stocks.example/api/oauth/approve", { client_id, redirect_uri: "https://evil.example/steal", code_challenge: "x".repeat(43), allow: true }, {
        origin: "https://stocks.example",
        host: "stocks.example",
      })
    )
    expect(answer.status).toBe(400)
  })

  it("says what is wrong in the standard's words", async () => {
    const answer = await token(form("https://stocks.example/api/oauth/token", { grant_type: "password" }))
    expect(answer.status).toBe(400)
    expect(await read(answer)).toMatchObject({ error: "unsupported_grant_type" })

    const bad = await token(form("https://stocks.example/api/oauth/token", { grant_type: "authorization_code", code: "nope" }))
    expect(await read(bad)).toMatchObject({ error: "invalid_grant" })

    const refused = await register(json("https://stocks.example/api/oauth/register", { redirect_uris: ["http://evil.example/cb"] }))
    expect(refused.status).toBe(400)
    expect(await read(refused)).toMatchObject({ error: "invalid_redirect_uri" })
  })
})
