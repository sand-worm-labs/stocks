import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ConnectAgent } from "@/components/Connect/ConnectAgent"

const request = { clientId: "cid", redirectUri: "https://claude.ai/api/mcp/auth_callback", state: "s1", codeChallenge: "c".repeat(43) }

const reply = (status: number, body: unknown) => vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe("the window that connects an agent", () => {
  afterEach(() => vi.restoreAllMocks())

  it("says who is asking, what it can do, that it can't spend the wallet, and where the person goes back to", () => {
    render(<ConnectAgent name="Claude" request={request} />)
    expect(screen.getByText("Connect Claude to Sandworm Stocks")).toBeTruthy()
    expect(screen.getByText(/See your strategies/)).toBeTruthy()
    expect(screen.getByText(/can't spend your wallet's money/)).toBeTruthy()
    expect(screen.getByText(/go back to claude\.ai/)).toBeTruthy()
  })

  it("asks the app to allow it, with what the agent sent, and goes where the app says", async () => {
    const fetch = reply(200, { redirect: "https://claude.ai/api/mcp/auth_callback?code=c1&state=s1" })
    const assign = vi.fn()
    vi.stubGlobal("location", { ...window.location, assign })
    render(<ConnectAgent name="Claude" request={request} />)

    fireEvent.click(screen.getByRole("button", { name: "Allow" }))

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://claude.ai/api/mcp/auth_callback?code=c1&state=s1"))
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe("/api/oauth/approve")
    expect(JSON.parse(String(init?.body))).toEqual({ client_id: "cid", redirect_uri: request.redirectUri, state: "s1", code_challenge: request.codeChallenge, allow: true })
    vi.unstubAllGlobals()
  })

  it("tells the app no when cancelled", async () => {
    const fetch = reply(200, { redirect: "https://claude.ai/api/mcp/auth_callback?error=access_denied" })
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() })
    render(<ConnectAgent name="Claude" request={request} />)

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({ allow: false })
    vi.unstubAllGlobals()
  })

  it("says what went wrong and lets the person try again", async () => {
    reply(400, { error: "This agent asked to come back to an address it didn't register" })
    render(<ConnectAgent name="Claude" request={request} />)

    fireEvent.click(screen.getByRole("button", { name: "Allow" }))

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "This agent asked to come back to an address it didn't register")
    expect(screen.getByRole("button", { name: "Allow" })).toHaveProperty("disabled", false)
  })

  it("says so when the person was signed out", async () => {
    reply(401, { error: "Sign in first" })
    render(<ConnectAgent name="Claude" request={request} />)
    fireEvent.click(screen.getByRole("button", { name: "Allow" }))
    expect((await screen.findByRole("alert")).textContent).toMatch(/signed out/)
  })
})
