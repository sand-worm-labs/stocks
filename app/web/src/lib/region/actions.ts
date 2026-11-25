"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import { REGION_COOKIE } from "@/constants/region"

import { isCountryCode } from "./countries"

const A_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

export async function saveRegion(code: string) {
  if (!isCountryCode(code)) throw new Error("That isn't a country")
  ;(await cookies()).set(REGION_COOKIE, code, { path: "/", sameSite: "lax", maxAge: A_YEAR_IN_SECONDS })
  revalidatePath("/", "layout")
}
