import { cookies } from "next/headers"

import { SESSION_COOKIE } from "./config"
import { readSession } from "./token"

// The person signed in on this request, if any. Outside a request there is none.
export async function getSignedInUserId() {
  try {
    return await readSession((await cookies()).get(SESSION_COOKIE)?.value)
  } catch {
    return undefined
  }
}
