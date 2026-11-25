import { z } from "zod"

// What research hands back, whoever did it (Sandworm's agent, an agent driving Sandworm from outside, or the stand-in). It is small on
// purpose: a verdict, a few numbers, one chart and the notebooks where the work can be opened. The full analysis lives in those notebooks.
// Everything is bounded because some of what arrives is written by a model.
const text = (max: number) => z.string().trim().min(1).max(max)

export const notebookLinkSchema = z.object({
  title: text(100),
  url: z.string().url().max(500),
})

const tone = z.enum(["good", "warn", "bad"])

const pointsOf = z.array(z.object({ label: text(30), value: z.number().finite() })).min(2).max(260)

export const researchResultSchema = z.object({
  headline: text(200),
  summary: text(1200),
  // The one-word answer to "edge or gambling", with how sure it is
  verdict: z.object({ tone, label: text(60) }).optional(),
  metrics: z.array(z.object({ label: text(40), value: text(40), note: text(120).optional() })).max(8),
  // Lines over time, each drawn from a notebook. `mark` is a level worth seeing, such as the loss the person said they'd panic at.
  charts: z
    .array(
      z.object({
        title: text(100),
        format: z.enum(["multiple", "percent", "currency"]).default("multiple"),
        series: z.array(z.object({ name: text(30), points: pointsOf })).min(1).max(3),
        mark: z.object({ label: text(40), value: z.number().finite() }).optional(),
        // The title of the notebook this is drawn in, so the page can link to it
        notebook: text(100).optional(),
      })
    )
    .max(3)
    .default([]),
  // What the numbers say, one plain sentence each
  checks: z.array(z.object({ tone, text: text(300) })).max(8).default([]),
  // How much of the money, and how much of the risk, each stock carries
  holdings: z.array(z.object({ symbol: text(20), weight: z.number().min(0).max(1), riskShare: z.number().min(0).max(1) })).max(12).default([]),
  // What was done, in order, each with the notebook it was done in when there is one
  steps: z.array(z.object({ label: text(40), url: z.string().url().max(500).optional() })).max(10).default([]),
  notes: z.array(text(300)).max(8).default([]),
  notebooks: z.array(notebookLinkSchema).min(1).max(8),
  // Where the numbers came from, and as of when
  dataNote: text(200).optional(),
  // True when the numbers are made up for a test, so the page can say so
  isExample: z.boolean().default(false),
})

export type ResearchResult = z.infer<typeof researchResultSchema>
export type NotebookLink = z.infer<typeof notebookLinkSchema>

export const SANDWORM_WEB_URL = () => (process.env.SANDWORM_WEB_URL ?? "https://app.sandwormlab.xyz").replace(/\/$/, "")

// A notebook link has to lead to Sandworm. A result comes from an agent, and a link in it must not be able to send a person elsewhere.
export function isSandwormLink(url: string) {
  try {
    return new URL(url).origin === new URL(SANDWORM_WEB_URL()).origin
  } catch {
    return false
  }
}
