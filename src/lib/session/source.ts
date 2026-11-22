import { cache } from "react"

import { sessionMockData } from "@/_mockdata/session"
import { getSignedInUserId } from "@/lib/auth/session"

import type { Session } from "./types"

// Cached for the render, so the layout and the page share one read. Who is signed in comes from the cookie; the rest of the
// profile is still the mock until accounts and settings are stored.
export const getSession = cache(
  async (): Promise<Session> => ({ ...sessionMockData, userId: await getSignedInUserId() })
)
