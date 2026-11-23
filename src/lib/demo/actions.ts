"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import { DEMO_MODELS_COOKIE } from "@/constants/demo"

import { isModelCount } from "./source"

const A_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

// Sets how many portfolios there are, and every page that shows them follows
export async function saveModelCount(count: number) {
  if (!isModelCount(count)) throw new Error("That isn't a number of portfolios")
  ;(await cookies()).set(DEMO_MODELS_COOKIE, String(count), { path: "/", sameSite: "lax", maxAge: A_YEAR_IN_SECONDS })
  revalidatePath("/", "layout")
}
