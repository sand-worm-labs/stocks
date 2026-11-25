import { BRIEF_BUDGETS, CUSTOM_BUDGET } from "@/constants/brief"

export const BUDGET_OPTIONS = [
  ...BRIEF_BUDGETS.map((value) => ({ value: String(value), label: value.toLocaleString("en-US") })),
  { value: CUSTOM_BUDGET, label: "Custom" },
]
