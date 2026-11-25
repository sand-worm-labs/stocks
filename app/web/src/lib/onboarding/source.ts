import { startersMockData } from "@/_mockdata/starters"

import type { Starter } from "@/types/onboarding"

export async function getStarters(): Promise<Starter[]> {
  return startersMockData
}

export async function getStarter(id: string | undefined) {
  return id ? (await getStarters()).find((starter) => starter.id === id) : undefined
}
