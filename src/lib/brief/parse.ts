import { z } from "zod"

// Which example brief the page shows, until the agent reads a real one
export const parseBriefExample = (value: unknown) =>
  z.enum(["ready", "needs-answers", "unrealistic"]).catch("ready").parse(value)
