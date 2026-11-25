import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { isSameOrigin } from "@/lib/auth/request"
import { StrategyError } from "@/lib/strategies/service"
import { getOwnerId } from "@/lib/strategies/source"

import { respond } from "./respond"

vi.mock("@/lib/auth/request", () => ({ isSameOrigin: vi.fn() }))
vi.mock("@/lib/strategies/source", () => ({ getOwnerId: vi.fn() }))

const post = (body: unknown) => new Request("http://app.test/api/x", { method: "POST", body: JSON.stringify(body) })
const schema = z.object({ name: z.string() })

const signedInAs = (ownerId?: string, sameOrigin = true) => {
  vi.mocked(getOwnerId).mockResolvedValue(ownerId)
  vi.mocked(isSameOrigin).mockReturnValue(sameOrigin)
}

describe("respond", () => {
  afterEach(() => vi.restoreAllMocks())

  it("gives the work the signed-in owner and the body that was sent", async () => {
    signedInAs("owner-1")
    const answer = await respond(post({ name: "a" }), { body: schema, status: 201 }, async ({ ownerId, body }) => ({
      ownerId,
      name: body.name,
    }))
    expect(answer.status).toBe(201)
    expect(await answer.json()).toEqual({ ownerId: "owner-1", name: "a" })
  })

  it("refuses a request that changes something from another site, before anything else", async () => {
    signedInAs("owner-1", false)
    const run = vi.fn()
    expect((await respond(post({}), {}, run)).status).toBe(403)
    expect(run).not.toHaveBeenCalled()
  })

  it("refuses someone who is not signed in", async () => {
    signedInAs(undefined)
    expect((await respond(post({}), {}, vi.fn())).status).toBe(401)
  })

  it("refuses a body that is not what the route expects", async () => {
    signedInAs("owner-1")
    const run = vi.fn()
    expect((await respond(post({ name: 3 }), { body: schema }, run)).status).toBe(400)
    expect(run).not.toHaveBeenCalled()
  })

  it("shows the message and status of a StrategyError, and hides anything else", async () => {
    signedInAs("owner-1")
    const known = await respond(post({}), {}, async () => {
      throw new StrategyError("That strategy wasn't found", 404)
    })
    expect(known.status).toBe(404)
    expect(await known.json()).toEqual({ error: "That strategy wasn't found" })

    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const unknown = await respond(post({}), {}, async () => {
      throw new Error("db password is hunter2")
    })
    expect(unknown.status).toBe(500)
    expect(JSON.stringify(await unknown.json())).not.toContain("hunter2")
  })
})
