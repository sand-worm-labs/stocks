import { NextResponse } from "next/server"
import type { z } from "zod"

import { isSameOrigin } from "@/lib/auth/request"
import { StrategyError } from "@/lib/strategies/service"
import { getOwnerId } from "@/lib/strategies/source"

const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })

// The one way an API route answers. Before anything else it makes sure the request came from this site's own pages, that someone is
// signed in, and that the body is what was expected; then it runs the route's work for that person, and turns what goes wrong into an
// answer that is safe to show. A route can't forget any of this, because it never touches the request itself.
export async function respond<S extends z.ZodType>(
  request: Request,
  schema: S | undefined,
  run: (ownerId: string, body: z.infer<S>) => Promise<unknown>,
  success = 200
) {
  // Only a request that changes something has to have come from this site's pages: reading what is yours cannot be done from another site
  if (request.method !== "GET" && !isSameOrigin(request))
    return json({ error: "This request didn't come from the app" }, 403)

  const ownerId = await getOwnerId()
  if (!ownerId) return json({ error: "Sign in first" }, 401)

  try {
    let body: z.infer<S> = undefined as z.infer<S>
    if (schema) {
      const parsed = schema.safeParse(await request.json().catch(() => undefined))
      if (!parsed.success) throw new StrategyError("The request is missing something or has something wrong in it", 400)
      body = parsed.data
    }
    return json(await run(ownerId, body), success)
  } catch (error) {
    if (error instanceof StrategyError) return json({ error: error.message }, error.status)
    console.error(error)
    return json({ error: "Something went wrong on our side. Try again in a moment" }, 500)
  }
}
