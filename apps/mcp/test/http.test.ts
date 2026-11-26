import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createHandler } from "../src/http"

let server: Server | undefined
afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())))

async function start(api: typeof fetch) {
  server = createServer(createHandler({ publicUrl: "https://mcp.example", apiUrl: "http://api.test", webPublicUrl: "https://stocks.example", fetchImpl: api }))
  await new Promise<void>((done) => server?.listen(0, done))
  return `http://localhost:${(server.address() as AddressInfo).port}`
}

const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
const call = { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }
const post = (url: string, token?: string, body: unknown = call) =>
  fetch(`${url}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })

describe("how a client finds out where to sign in", () => {
  it("says the app is the place, and which address this server is", async () => {
    const url = await start(reply(200, {}))
    const body = await (await fetch(`${url}/.well-known/oauth-protected-resource`)).json()
    expect(body).toMatchObject({ resource: "https://mcp.example/mcp", authorization_servers: ["https://stocks.example"], scopes_supported: ["stocks"] })
  })

  it("answers the same for the address with the path on it", async () => {
    const url = await start(reply(200, {}))
    expect((await fetch(`${url}/.well-known/oauth-protected-resource/mcp`)).status).toBe(200)
  })

  it("answers a request with no token with the standard 401 that points there", async () => {
    const api = reply(200, {})
    const url = await start(api)
    const response = await post(url)
    expect(response.status).toBe(401)
    expect(response.headers.get("www-authenticate")).toBe('Bearer resource_metadata="https://mcp.example/.well-known/oauth-protected-resource"')
    expect(api).not.toHaveBeenCalled()
  })
})

describe("a request with a token", () => {
  it("is checked with the app, with the token on it, before anything is answered", async () => {
    const api = reply(200, { ok: true })
    const url = await start(api)
    await post(url, "agent-token")
    const [address, init] = api.mock.calls[0] ?? []
    expect(String(address)).toBe("http://api.test/oauth/whoami")
    expect(init.headers.Authorization).toBe("Bearer agent-token")
  })

  it("is answered with the standard 401 when the app says the token isn't good, so the agent signs in again", async () => {
    const url = await start(reply(401, { error: "Sign in first" }))
    const response = await post(url, "expired")
    expect(response.status).toBe(401)
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata")
  })

  it("lists the tools when the token is good", async () => {
    const url = await start(reply(200, { ok: true }))
    const response = await post(url, "good")
    expect(response.status).toBe(200)
    const names = ((await response.json()) as { result: { tools: { name: string }[] } }).result.tools.map(({ name }) => name)
    expect(names).toContain("get_rules")
    expect(names).toContain("edit_rules")
  })

  it("says so when the app can't be reached", async () => {
    const url = await start(vi.fn().mockRejectedValue(new Error("down")))
    expect((await post(url, "good")).status).toBe(502)
  })
})

describe("everything else", () => {
  it("answers health, and refuses other paths and methods", async () => {
    const url = await start(reply(200, {}))
    expect((await fetch(`${url}/health`)).status).toBe(200)
    expect((await fetch(`${url}/nope`)).status).toBe(404)
    expect((await fetch(`${url}/mcp`)).status).toBe(405)
  })
})
