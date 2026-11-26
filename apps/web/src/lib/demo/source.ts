import { cookies } from "next/headers"

import { DEFAULT_DEMO_MODELS, DEMO_MODELS_COOKIE, MAX_DEMO_MODELS } from "@/constants/demo"

export const isModelCount = (value: number) => Number.isInteger(value) && value >= 0 && value <= MAX_DEMO_MODELS

// How many portfolios to make up. Outside a request there is no cookie to read, so it is the usual number.
export async function getModelCount() {
  try {
    const raw = (await cookies()).get(DEMO_MODELS_COOKIE)?.value
    const count = raw === undefined ? NaN : Number(raw)
    return isModelCount(count) ? count : DEFAULT_DEMO_MODELS
  } catch {
    return DEFAULT_DEMO_MODELS
  }
}
