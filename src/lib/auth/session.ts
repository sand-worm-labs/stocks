import { cookies } from "next/headers"

import { SESSION_COOKIE } from "./config"
import { readSession } from "./token"

export async function getSignedInUserId() {
  try {
    return await readSession((await cookies()).get(SESSION_COOKIE)?.value)
  } catch {
    return undefined
  }
}
