import type { Schedule } from "@/types/strategy"

export const EVERY: { value: Schedule; label: string }[] = [
  { value: "daily", label: "daily" },
  { value: "weekly", label: "weekly" },
  { value: "monthly", label: "monthly" },
]
