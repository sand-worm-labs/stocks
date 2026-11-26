import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { OnboardingFlow } from "@/components/Onboarding/OnboardingFlow"
import { getCategories } from "@/lib/markets/source"
import { readOnboarding } from "@/lib/onboarding/profile"
import { getStarters } from "@/lib/onboarding/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Welcome" }

type OnboardingPageProps = { searchParams: Promise<{ restart?: string }> }

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const [{ restart }, session, starters, { profile, done }, categories] = await Promise.all([
    searchParams,
    getSession(),
    getStarters(),
    readOnboarding(),
    getCategories(),
  ])
  if (done && !restart) redirect("/")

  return (
    <OnboardingFlow
      initial={profile}
      region={session.region}
      chain={session.network.chain}
      starters={starters}
      offeredInterests={categories.filter(({ isInterest }) => isInterest)}
    />
  )
}
