import { BRIEF_BUDGETS, BRIEF_GOALS, BRIEF_HORIZONS } from "@/constants/brief"
import type { BriefQuestion, MissingField } from "@/types/brief"

export const QUESTIONS: Record<MissingField, BriefQuestion> = {
  goal: {
    text: "What is this for?",
    hint: "Growth takes more risk than income.",
    answers: BRIEF_GOALS.map((value) => ({ label: value, change: { field: "goal", value } })),
  },
  horizon: {
    text: "How long will you hold?",
    hint: "Short horizons get less risky mixes.",
    answers: BRIEF_HORIZONS.map((value) => ({ label: value, change: { field: "horizon", value } })),
  },
  loss: {
    text: "How big a fall could you sit through without selling?",
    hint: "The backtest has to stay above this, or I'll flag it.",
    answers: [10, 20, 35].map((value) => ({ label: `−${value}%`, change: { field: "loss", value } })),
  },
  budget: {
    text: "How much do you want to put in?",
    hint: "You have 0 USDC now; paper trading works with any amount.",
    answers: BRIEF_BUDGETS.map((value) => ({
      label: `${value.toLocaleString("en-US")} USDC`,
      change: { field: "budget", value },
    })),
  },
}

export const CHIP =
  "border-border hover:border-primary hover:bg-hover-bg dark:border-border-tertiary dark:hover:bg-sidebar-hover rounded-full border px-3.5 py-1.5 text-left text-sm transition-[background-color,border-color] duration-200 ease-out"
