"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ONBOARDING_COOKIES, ONBOARDING_PATH } from "@/constants/onboarding"

import { getSignedInUserId } from "@/lib/auth/session"

import { cleanInterests, cleanName } from "./profile"
import { onboardedMarker } from "./profile-marker"
import { getStarter } from "./source"

const A_YEAR_IN_SECONDS = 60 * 60 * 24 * 365
const OPTIONS = { path: "/", sameSite: "lax", maxAge: A_YEAR_IN_SECONDS } as const

// What has been answered so far is kept as it is answered, so a reload picks up where it was left
export async function saveOnboarding(answers: { name?: string; interests?: string[] }) {
  const jar = await cookies()
  if (answers.interests) jar.set(ONBOARDING_COOKIES.interests, cleanInterests(answers.interests).join(","), OPTIONS)
  if (answers.name !== undefined) {
    const name = cleanName(answers.name)
    if (name) jar.set(ONBOARDING_COOKIES.name, name, OPTIONS)
  }
}

// The end of the stepper, by finishing or by skipping it. It shows once, and the welcome window is next on the first page.
// Having chosen a starting brief, or to look around the stocks, goes there; otherwise to the home screen.
export async function finishOnboarding(to?: { starter?: string; stocks?: boolean }) {
  const jar = await cookies()
  const marker = onboardedMarker(await getSignedInUserId())
  // The welcome window is for an account's first time through, not for going through it again by choice
  const first = jar.get(ONBOARDING_COOKIES.done)?.value !== marker
  jar.set(ONBOARDING_COOKIES.done, marker, OPTIONS)
  if (first || !jar.get(ONBOARDING_COOKIES.welcome)) jar.set(ONBOARDING_COOKIES.welcome, "pending", OPTIONS)
  revalidatePath("/", "layout")

  if (to?.stocks) redirect("/strategies/new/stocks")
  const starter = await getStarter(to?.starter)
  redirect(starter ? `/strategies/new/brief?starter=${starter.id}` : "/")
}

export async function dismissWelcome() {
  ;(await cookies()).set(ONBOARDING_COOKIES.welcome, "done", OPTIONS)
  revalidatePath("/", "layout")
}

// For working on the first run, which shows once: forget this browser has been through it, so the stepper, the welcome window and the
// tour come again as they do for a new account. Only the browser's answers go; the account and its strategies are not touched.
// Never in production: it refuses there however it was reached, so it can't be used by mistake on a real account.
export async function resetOnboarding() {
  if (process.env.NODE_ENV === "production") throw new Error("The first run can only be reset while developing")

  const jar = await cookies()
  for (const name of Object.values(ONBOARDING_COOKIES)) jar.delete(name)
  revalidatePath("/", "layout")
  redirect(ONBOARDING_PATH)
}
