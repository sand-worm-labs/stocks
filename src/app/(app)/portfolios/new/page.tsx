import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { routeHref } from "@/config/routes"
import { ONBOARDING_PATH } from "@/constants/onboarding"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "New strategy" }

// A new portfolio starts from its brief. The checks of whether someone can trade now belong to the first run, asked once
// after sign-up, so anyone who hasn't been through it goes there first.
export default async function NewPortfolioPage() {
  const { onboarded } = await getSession()
  redirect(onboarded ? (routeHref("brief") ?? "/") : ONBOARDING_PATH)
}
