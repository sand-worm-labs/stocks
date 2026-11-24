"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ONBOARDING_COOKIES } from "@/constants/onboarding"

import { cleanInterests, cleanName } from "./profile"
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
  jar.set(ONBOARDING_COOKIES.done, "1", OPTIONS)
  if (!jar.get(ONBOARDING_COOKIES.welcome)) jar.set(ONBOARDING_COOKIES.welcome, "pending", OPTIONS)
  revalidatePath("/", "layout")

  if (to?.stocks) redirect("/strategies/new/stocks")
  const starter = await getStarter(to?.starter)
  redirect(starter ? `/strategies/new/brief?starter=${starter.id}` : "/")
}

export async function dismissWelcome() {
  ;(await cookies()).set(ONBOARDING_COOKIES.welcome, "done", OPTIONS)
  revalidatePath("/", "layout")
}
