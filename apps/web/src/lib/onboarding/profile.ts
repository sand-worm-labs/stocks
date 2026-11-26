import { cookies } from "next/headers"

import { INTERESTS, NAME_MAX_LENGTH, ONBOARDING_COOKIES } from "@/constants/onboarding"
import { getSignedInUserId } from "@/lib/auth/session"

import type { OnboardingProfile } from "@/types/onboarding"
import { onboardedMarker } from "./profile-marker"

const known = new Set(INTERESTS.map(({ id }) => id))

export const cleanName = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, NAME_MAX_LENGTH)
export const cleanInterests = (values: string[]) => values.filter((value) => known.has(value))

export async function readOnboarding(userId?: string) {
  try {
    const account = userId ?? (await getSignedInUserId())
    const jar = await cookies()
    const profile: OnboardingProfile = {
      name: jar.get(ONBOARDING_COOKIES.name)?.value,
      interests: cleanInterests((jar.get(ONBOARDING_COOKIES.interests)?.value ?? "").split(",")),
    }
    return {
      profile,
      done: jar.get(ONBOARDING_COOKIES.done)?.value === onboardedMarker(account),
      welcomePending: jar.get(ONBOARDING_COOKIES.welcome)?.value === "pending",
    }
  } catch {
    return { profile: { interests: [] } as OnboardingProfile, done: false, welcomePending: false }
  }
}
