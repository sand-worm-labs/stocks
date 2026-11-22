import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { OnboardingFlow } from "@/components/Onboarding/OnboardingFlow"
import { readOnboarding } from "@/lib/onboarding/profile"
import { getStarters } from "@/lib/onboarding/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Welcome" }

type OnboardingPageProps = { searchParams: Promise<{ restart?: string }> }

// The first run, shown once after sign-up. Having been through it, there is no reason to see it again, unless asked to.
export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const [{ restart }, session, starters, { profile, done }] = await Promise.all([
    searchParams,
    getSession(),
    getStarters(),
    readOnboarding(),
  ])
  if (done && !restart) redirect("/")

  return <OnboardingFlow initial={profile} region={session.region} chain={session.network.chain} starters={starters} />
}
