import { cache } from "react"

import { sessionMockData } from "@/_mockdata/session"

import type { Session } from "./types"

// Cached for the render, so the layout and the page share one read.
export const getSession = cache(async (): Promise<Session> => sessionMockData)
