import { createHash } from "node:crypto"

import {
  checkAuthorizeRequest,
  exchangeCode,
  isAllowedRedirect,
  issueCode,
  OAuthError,
  readAccessToken,
  readClient,
  redirectWith,
  refreshTokens,
  registerClient,
} from "@/features/auth/mcp-oauth/oauth"
import { signFor } from "@/features/auth/core/token"

const OWNER = "3f9c1a52-8d41-4a3e-b7aa-0c61d2e9f845"
const REDIRECT = "https://claude.ai/api/mcp/auth_callback"
const VERIFIER = "a-long-random-secret-the-agent-made-up-for-this-one-connection-0123456789"
const challengeOf = (verifier: string) => createHash("sha256").update(verifier).digest("base64url")

beforeAll(() => {
  process.env.AUTH_SECRET = "a-test-secret-that-is-long-enough-to-use"
})

async function connected() {
  const { client_id } = await registerClient({ redirect_uris: [REDIRECT], client_name: "Claude" })
  const checked = await checkAuthorizeRequest({
    response_type: "code",
    client_id,
    redirect_uri: REDIRECT,
    state: "s1",
    code_challenge: challengeOf(VERIFIER),
    code_challenge_method: "S256",
  })
  if (!checked.ok) throw new Error(checked.error)
  return { clientId: client_id, request: checked.request }
}

describe("redirect addresses", () => {
  it.each([
    ["https://claude.ai/api/mcp/auth_callback", true],
    ["http://localhost:6274/callback", true],
    ["http://127.0.0.1:9000/cb", true],
    ["http://evil.example/cb", false],
    ["https://claude.ai/cb#fragment", false],
    ["javascript:alert(1)", false],
    ["not a url", false],
  ])("%s -> %s", (uri, allowed) => {
    expect(isAllowedRedirect(uri)).toBe(allowed)
  })
})

describe("an agent registering itself", () => {
  it("is given an id that holds what it said it was and where it goes back to", async () => {
    const { client_id } = await registerClient({ redirect_uris: [REDIRECT], client_name: "  Claude  " })
    expect(await readClient(client_id)).toEqual({ id: client_id, name: "Claude", redirectUris: [REDIRECT] })
  })

  it("is called 'An agent' when it gives no name", async () => {
    const { client_id } = await registerClient({ redirect_uris: [REDIRECT] })
    expect((await readClient(client_id))?.name).toBe("An agent")
  })

  it.each([[undefined], [{}], [{ redirect_uris: [] }], [{ redirect_uris: ["http://evil.example/cb"] }], [{ redirect_uris: [1] }], [null]])(
    "is refused for %j",
    async (input) => {
      await expect(registerClient(input)).rejects.toBeInstanceOf(OAuthError)
    }
  )

  it("can't be an id someone made up", async () => {
    expect(await readClient("made-up")).toBeUndefined()
    expect(await readClient(await signFor("session", "x", 60))).toBeUndefined()
  })
})

describe("the request an agent sends the browser with", () => {
  it("is accepted when everything is as registered", async () => {
    const { request } = await connected()
    expect(request).toMatchObject({ redirectUri: REDIRECT, state: "s1" })
  })

  it("is refused when it asks to come back to an address it didn't register", async () => {
    const { clientId } = await connected()
    const checked = await checkAuthorizeRequest({
      response_type: "code",
      client_id: clientId,
      redirect_uri: "https://evil.example/cb",
      code_challenge: challengeOf(VERIFIER),
      code_challenge_method: "S256",
    })
    expect(checked.ok).toBe(false)
  })

  it("is refused without the proof key, or with one that isn't S256", async () => {
    const { clientId } = await connected()
    const base = { response_type: "code", client_id: clientId, redirect_uri: REDIRECT }
    expect((await checkAuthorizeRequest({ ...base, code_challenge_method: "S256" })).ok).toBe(false)
    expect((await checkAuthorizeRequest({ ...base, code_challenge: challengeOf(VERIFIER), code_challenge_method: "plain" })).ok).toBe(false)
    expect((await checkAuthorizeRequest({ ...base, code_challenge: "short", code_challenge_method: "S256" })).ok).toBe(false)
  })

  it("is refused for an agent that isn't known", async () => {
    expect((await checkAuthorizeRequest({ response_type: "code", client_id: "nope", redirect_uri: REDIRECT })).ok).toBe(false)
  })
})

describe("swapping a code for a token", () => {
  it("gives a token for the person who allowed it, which reads back as them", async () => {
    const { clientId, request } = await connected()
    const code = await issueCode(OWNER, request)
    const tokens = await exchangeCode({ code, verifier: VERIFIER, clientId, redirectUri: REDIRECT })

    expect(tokens).toMatchObject({ token_type: "Bearer", scope: "stocks" })
    expect(await readAccessToken(tokens.access_token)).toBe(OWNER)
  })

  it("is refused with the wrong proof key", async () => {
    const { clientId, request } = await connected()
    const code = await issueCode(OWNER, request)
    await expect(exchangeCode({ code, verifier: "someone-elses-guess".padEnd(50, "x"), clientId, redirectUri: REDIRECT })).rejects.toMatchObject({ code: "invalid_grant" })
  })

  it("is refused for another agent or another address than the code was made for", async () => {
    const { clientId, request } = await connected()
    const other = await registerClient({ redirect_uris: [REDIRECT] })
    const code = await issueCode(OWNER, request)
    await expect(exchangeCode({ code, verifier: VERIFIER, clientId: other.client_id, redirectUri: REDIRECT })).rejects.toMatchObject({ code: "invalid_grant" })
    await expect(exchangeCode({ code, verifier: VERIFIER, clientId, redirectUri: "https://claude.ai/other" })).rejects.toMatchObject({ code: "invalid_grant" })
  })

  it("is refused for something that is not a code", async () => {
    const { clientId } = await connected()
    const session = await signFor("session", OWNER, 60)
    await expect(exchangeCode({ code: session, verifier: VERIFIER, clientId, redirectUri: REDIRECT })).rejects.toMatchObject({ code: "invalid_grant" })
    await expect(exchangeCode({ verifier: VERIFIER, clientId, redirectUri: REDIRECT })).rejects.toMatchObject({ code: "invalid_grant" })
  })

  it("is refused once the code has run out", async () => {
    const { clientId } = await connected()
    const expired = await signFor("oauth-code", OWNER, -10, { cid: clientId, ru: REDIRECT, cc: challengeOf(VERIFIER) })
    await expect(exchangeCode({ code: expired, verifier: VERIFIER, clientId, redirectUri: REDIRECT })).rejects.toMatchObject({ code: "invalid_grant" })
  })
})

describe("tokens", () => {
  it("refreshes into a new one for the same person", async () => {
    const { clientId, request } = await connected()
    const first = await exchangeCode({ code: await issueCode(OWNER, request), verifier: VERIFIER, clientId, redirectUri: REDIRECT })
    const next = await refreshTokens({ refreshToken: first.refresh_token, clientId })
    expect(await readAccessToken(next.access_token)).toBe(OWNER)
  })

  it("won't refresh for another agent, or with an access token", async () => {
    const { clientId, request } = await connected()
    const first = await exchangeCode({ code: await issueCode(OWNER, request), verifier: VERIFIER, clientId, redirectUri: REDIRECT })
    await expect(refreshTokens({ refreshToken: first.refresh_token, clientId: "other" })).rejects.toMatchObject({ code: "invalid_grant" })
    await expect(refreshTokens({ refreshToken: first.access_token, clientId })).rejects.toMatchObject({ code: "invalid_grant" })
  })

  it("is not read as an access token when it is a refresh token, a code or a session", async () => {
    const { clientId, request } = await connected()
    const tokens = await exchangeCode({ code: await issueCode(OWNER, request), verifier: VERIFIER, clientId, redirectUri: REDIRECT })
    expect(await readAccessToken(tokens.refresh_token)).toBeUndefined()
    expect(await readAccessToken(await issueCode(OWNER, request))).toBeUndefined()
    expect(await readAccessToken(await signFor("session", OWNER, 60))).toBeUndefined()
    expect(await readAccessToken("junk")).toBeUndefined()
  })
})

describe("the address the browser goes back to", () => {
  it("carries the code and the state the agent sent", () => {
    expect(redirectWith(REDIRECT, { code: "c1", state: "s1" })).toBe(`${REDIRECT}?code=c1&state=s1`)
  })

  it("leaves out what isn't there", () => {
    expect(redirectWith(REDIRECT, { error: "access_denied", state: undefined })).toBe(`${REDIRECT}?error=access_denied`)
  })
})
