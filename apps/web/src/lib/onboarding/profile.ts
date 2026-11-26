import { cookies } from "next/headers"

import { NAME_MAX_LENGTH, ONBOARDING_COOKIES } from "@/constants/onboarding"
import { getSignedInUserId } from "@/lib/auth/session"

import type { OnboardingProfile } from "@/types/onboarding"
import { onboardedMarker } from "./profile-marker"

// An interest is a category's id. Which ids exist is the database's business, so only the shape is checked here: one that has since gone
// matches nothing.
const INTEREST_ID = /^[a-z0-9-]{1,40}$/
const MOST_INTERESTS = 20

export const cleanName = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, NAME_MAX_LENGTH)
export const cleanInterests = (values: string[]) => values.filter((value) => INTEREST_ID.test(value)).slice(0, MOST_INTERESTS)

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
