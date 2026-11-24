import { cache } from "react"

import { authRequired } from "@/lib/auth/config"
import { getSignedInUserId } from "@/lib/auth/session"
import { getMarket, getPipeline } from "@/lib/pipeline/source"
import { getStore } from "@/lib/store"

import { createStrategyService } from "./service"

// The service the pages and the API use, joined to the real store and the agent. Swapping either happens in their own `source` and
// `getStore`, never here.
export const getStrategyService = () =>
  createStrategyService({ store: getStore(), pipeline: getPipeline(), market: getMarket })

// Who is acting. Nobody signed in, with sign-in required, is nobody; with it switched off for local work, everyone is one local person.
export async function getOwnerId() {
  return (await getSignedInUserId()) ?? (authRequired() ? undefined : "local")
}

// What this person has made. Research that has run its time is finished as it is read, so a strategy left researching is found ready when
// its owner comes back, with no one watching in between.
export const getOwnStrategies = cache(async () => {
  const ownerId = await getOwnerId()
  if (!ownerId) return []
  const service = getStrategyService()
  return Promise.all((await getStore().list(ownerId)).map((record) => service.settle(record)))
})

// One strategy of theirs, read once for the render however many parts of the page ask. Someone else's is not found.
export const getOwnStrategy = cache(async (id: string) => {
  const ownerId = await getOwnerId()
  const record = await getStore().get(id)
  return record && record.ownerId === ownerId ? getStrategyService().settle(record) : undefined
})
