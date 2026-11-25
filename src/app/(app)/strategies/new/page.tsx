import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { routeHref } from "@/config/routes"
import { ONBOARDING_PATH } from "@/constants/onboarding"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "New strategy" }

export default async function NewPortfolioPage() {
  const { onboarded } = await getSession()
  redirect(onboarded ? (routeHref("brief") ?? "/") : ONBOARDING_PATH)
}
