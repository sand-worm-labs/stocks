import { z } from "zod"

import { respond } from "@/lib/api/respond"
import { checkAuthorizeRequest, issueCode, redirectWith } from "@/lib/auth/oauth"
import { StrategyError } from "@/lib/strategies/service"

const approveSchema = z.object({
  client_id: z.string(),
  redirect_uri: z.string(),
  state: z.string().optional(),
  code_challenge: z.string(),
  allow: z.boolean(),
})

// The person has answered the agent's request in the app: where to send the browser back to, with the code if they allowed it. The request is
// checked again here in full, since what the page held is not to be trusted.
export async function POST(request: Request) {
  return respond(request, { body: approveSchema }, async ({ ownerId, body }) => {
    const checked = await checkAuthorizeRequest({
      response_type: "code",
      client_id: body.client_id,
      redirect_uri: body.redirect_uri,
      state: body.state,
      code_challenge: body.code_challenge,
      code_challenge_method: "S256",
    })
    if (!checked.ok) throw new StrategyError(checked.error, 400)

    const { request: authorize } = checked
    if (!body.allow) return { redirect: redirectWith(authorize.redirectUri, { error: "access_denied", state: authorize.state }) }
    return { redirect: redirectWith(authorize.redirectUri, { code: await issueCode(ownerId, authorize), state: authorize.state }) }
  })
}
