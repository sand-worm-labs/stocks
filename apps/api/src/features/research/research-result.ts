import { z } from "zod"

import { SECTION_IDS } from "./report-outline"

// What research hands back, whoever did it (Sandworm's agent, an agent driving Sandworm from outside, or the stand-in). It is small on
// purpose: a verdict, a few numbers, a couple of charts and the one notebook where the work can be opened. The full analysis lives in that
// notebook: a strategy is researched in one.
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
  // `help` is what the little (i) beside a number says: what it means, in words a first-time investor can use
  metrics: z.array(z.object({ label: text(40), value: text(40), note: text(120).optional(), help: text(500).optional() })).max(8),
  // Lines over time, each drawn from a notebook. `mark` is a level worth seeing, such as the loss the person said they'd panic at.
  charts: z
    .array(
      z.object({
        title: text(100),
        // What the chart is, so the page can build on it: the growth line is what the calculator plays with
        kind: z.enum(["growth", "drop"]).optional(),
        format: z.enum(["multiple", "percent", "currency"]).default("multiple"),
        series: z.array(z.object({ name: text(30), points: pointsOf })).min(1).max(3),
        mark: z.object({ label: text(40), value: z.number().finite() }).optional(),
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
  // How a year went across every 12-month stretch of the test: the one 1 in 20 fell short of, the middle, and the one 1 in 20 beat
  yearRange: z.object({ bad: z.number(), typical: z.number(), good: z.number() }).optional(),
  // Can it be bought: how deep each token's pool is, and how much one order would move the price
  tradability: z
    .object({
      stocks: z.array(z.object({ symbol: text(20), liquidity: z.number().min(0), impact: z.number().min(0) })).max(12),
      text: text(300),
    })
    .optional(),
  // Why each stock is in, with what it did on its own over the test
  selection: z.array(z.object({ symbol: text(20), name: text(60).optional(), text: text(300) })).max(12).default([]),
  // Where the facts came from
  sources: z.array(z.object({ name: text(40), title: text(120), url: z.string().url().max(500).optional(), note: text(80).optional() })).max(8).default([]),
  notes: z.array(text(300)).max(8).default([]),
  // The one notebook all the research is in, with its summary at the top
  notebook: notebookLinkSchema,
  // The block of that notebook each part of the report is built from, by the part's id (see report-outline.ts): what a link from that part of the
  // report opens. Optional, and any part may be missing; a part with no block opens the notebook at the top.
  blocks: z.record(z.enum(SECTION_IDS), z.string().min(1).max(100)).optional(),
  // A short, specific name for the strategy that fits the idea, chosen by whoever did the research. Used only while the strategy still has the
  // name it was given when it was made: one the person chose is never replaced.
  name: text(60).optional(),
  // Where the numbers came from, and as of when
  dataNote: text(200).optional(),
  // True when the numbers are made up for a test, so the page can say so
  isExample: z.boolean().default(false),
})

export type ResearchResult = z.infer<typeof researchResultSchema>

// The fields the schema fills in when it is missing. A result is checked once, as it arrives, and kept as JSON: one kept before a field
// was added has no such field, and the schema is not run on it again. `completeResult` is what is read back through.
const DEFAULTS = {
  charts: [],
  checks: [],
  holdings: [],
  steps: [],
  selection: [],
  sources: [],
  notes: [],
  isExample: false,
} satisfies Partial<ResearchResult>

// A result kept before a strategy had one notebook has a list of them, and its first is the one that held the research
type Stored = Omit<ResearchResult, "notebook"> & { notebook?: NotebookLink; notebooks?: NotebookLink[] }

export function completeResult(stored: Stored): ResearchResult {
  const { notebooks, ...rest } = stored
  // Every result that was kept had at least one, so there is one to find
  const notebook = (stored.notebook ?? notebooks?.[0]) as NotebookLink
  return { ...DEFAULTS, ...rest, notebook }
}
export type NotebookLink = z.infer<typeof notebookLinkSchema>
