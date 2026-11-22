export type BriefField = {
  label: string
  term?: string
  value: string
  state: "got-it" | "missing" | "guess" | "unrealistic"
}

export type BriefQuestion = { id: string; text: string; options: string[]; hint: string }

// What the agent made of a brief: ready to go, in need of answers, or not something it can honestly aim for
export type BriefReview = {
  // The draft portfolio the brief becomes once it is continued
  portfolioId: string
  text: string
  status: "ready" | "needs-answers" | "unrealistic"
  understood: BriefField[]
  questions: BriefQuestion[]
  // Shown for an unrealistic brief
  concern?: string
  alternatives: string[]
}
