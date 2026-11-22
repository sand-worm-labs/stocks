import { cookies } from "next/headers"

import { INTERESTS, NAME_MAX_LENGTH, ONBOARDING_COOKIES } from "@/constants/onboarding"

import type { OnboardingProfile } from "./types"

const known = new Set(INTERESTS.map(({ id }) => id))

export const cleanName = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, NAME_MAX_LENGTH)
export const cleanInterests = (values: string[]) => values.filter((value) => known.has(value))

// What this browser has told us so far, from its cookies. Outside a request, nothing.
export async function readOnboarding() {
  try {
    const jar = await cookies()
    const profile: OnboardingProfile = {
      name: jar.get(ONBOARDING_COOKIES.name)?.value,
      interests: cleanInterests((jar.get(ONBOARDING_COOKIES.interests)?.value ?? "").split(",")),
    }
    return {
      profile,
      done: jar.get(ONBOARDING_COOKIES.done)?.value === "1",
      welcomePending: jar.get(ONBOARDING_COOKIES.welcome)?.value === "pending",
    }
  } catch {
    return { profile: { interests: [] } as OnboardingProfile, done: false, welcomePending: false }
  }
}
