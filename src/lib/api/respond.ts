import { NextResponse } from "next/server"
import type { z } from "zod"

import { isSameOrigin } from "@/lib/auth/request"
import { StrategyError } from "@/lib/strategies/service"
import { getOwnerId } from "@/lib/strategies/source"

// What a route with an `[id]` in its path is given besides the request
export type IdParams = { params: Promise<{ id: string }> }

type Schema = z.ZodType | undefined
type Parsed<S extends Schema> = S extends z.ZodType ? z.infer<S> : undefined

const answer = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })

async function readBody(request: Request, schema: Schema): Promise<unknown> {
  if (!schema) return undefined

  const parsed = schema.safeParse(await request.json().catch(() => undefined))
  if (!parsed.success) throw new StrategyError("The request is missing something or has something wrong in it", 400)
  return parsed.data
}

function failure(error: unknown) {
  if (error instanceof StrategyError) return answer({ error: error.message }, error.status)

  console.error(error)
  return answer({ error: "Something went wrong on our side. Try again in a moment" }, 500)
}

// The one way an API route answers, so a route can't forget a check: it never touches the request itself.
//
//   respond(request, { body: schema, status: 201 }, async ({ ownerId, body }) => result)
//
// In order, it makes sure the request came from this site's own pages, that someone is signed in, and that the body is what was
// expected (when the route says what that is). Then it runs the route's work for that person, and turns anything that goes wrong into an
// answer that is safe to show.
export async function respond<S extends Schema = undefined>(
  request: Request,
  options: { body?: S; status?: number },
  run: (input: { ownerId: string; body: Parsed<S> }) => Promise<unknown>
) {
  // Only a request that changes something has to have come from this site's pages: reading what is yours cannot be done from another site
  const changesSomething = request.method !== "GET"
  if (changesSomething && !isSameOrigin(request)) return answer({ error: "This request didn't come from the app" }, 403)

  const ownerId = await getOwnerId()
  if (!ownerId) return answer({ error: "Sign in first" }, 401)

  try {
    const body = (await readBody(request, options.body)) as Parsed<S>
    return answer(await run({ ownerId, body }), options.status ?? 200)
  } catch (error) {
    return failure(error)
  }
}
