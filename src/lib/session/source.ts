import { cookies } from "next/headers"
import { cache } from "react"

import { sessionMockData } from "@/_mockdata/session"
import { TRADING_MODE_COOKIE, TRADING_MODE_LABEL } from "@/constants/portfolio"
import { REGION_COOKIE } from "@/constants/region"
import { getSignedInUserId } from "@/lib/auth/session"
import { readOnboarding } from "@/lib/onboarding/profile"
import { isCountryCode } from "@/lib/region/countries"

import type { Session } from "./types"

// Where the owner said they live, until there is an account to keep it in. Outside a request there is no cookie to read.
async function savedRegion() {
  try {
    const value = (await cookies()).get(REGION_COOKIE)?.value
    return isCountryCode(value) ? value : undefined
  } catch {
    return undefined
  }
}

// Paper trading, or their wallet: what they last chose in the trading mode menu
async function savedMode(): Promise<keyof typeof TRADING_MODE_LABEL> {
  try {
    return (await cookies()).get(TRADING_MODE_COOKIE)?.value === "live" ? "live" : "paper"
  } catch {
    return "paper"
  }
}

// Cached for the render, so the layout and the page share one read. Who is signed in and where they live come from cookies;
// the rest of the profile is still the mock until accounts and settings are stored.
export const getSession = cache(async (): Promise<Session> => {
  const { profile, done, welcomePending } = await readOnboarding()

  return {
    ...sessionMockData,
    user: { firstName: profile.name ?? sessionMockData.user.firstName },
    userId: await getSignedInUserId(),
    network: { ...sessionMockData.network, mode: await savedMode() },
    region: (await savedRegion()) ?? sessionMockData.region,
    onboarded: done,
    welcomePending,
    interests: profile.interests,
  }
})
