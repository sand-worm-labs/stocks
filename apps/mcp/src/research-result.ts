import { z } from "zod"

// The parts of the report, as the app names them (apps/api/src/features/research/report-outline.ts); a test fails when they differ
export const SECTION_IDS = ["answer", "numbers", "growth", "checks", "drawdown", "risk", "buyable", "stocks", "sources"] as const

// What an agent hands back as research. This is a copy of the app's own schema (apps/api/src/features/research/research-result.ts), so the agent is told
// what shape to build. The app checks the result in full when it arrives, so a difference here can't let a bad one in; a test (see
// research-result.test.ts) fails when the two stop matching, so the agent is never told the wrong shape.
const text = (max: number) => z.string().trim().min(1).max(max)

const tone = z.enum(["good", "warn", "bad"])
const pointsOf = z.array(z.object({ label: text(30), value: z.number().finite() })).min(2).max(260)

export const researchResultSchema = z.object({
  headline: text(200),
  summary: text(1200),
  verdict: z.object({ tone, label: text(60) }).optional(),
  metrics: z.array(z.object({ label: text(40), value: text(40), note: text(120).optional(), help: text(500).optional() })).max(8),
  charts: z
    .array(
      z.object({
        title: text(100),
        kind: z.enum(["growth", "drop"]).optional(),
        format: z.enum(["multiple", "percent", "currency"]).default("multiple"),
        series: z.array(z.object({ name: text(30), points: pointsOf })).min(1).max(3),
        mark: z.object({ label: text(40), value: z.number().finite() }).optional(),
      })
    )
    .max(3)
    .default([]),
  checks: z.array(z.object({ tone, text: text(300) })).max(8).default([]),
  holdings: z.array(z.object({ symbol: text(20), weight: z.number().min(0).max(1), riskShare: z.number().min(0).max(1) })).max(12).default([]),
  steps: z.array(z.object({ label: text(40), url: z.string().url().max(500).optional() })).max(10).default([]),
  yearRange: z.object({ bad: z.number(), typical: z.number(), good: z.number() }).optional(),
  tradability: z
    .object({
      stocks: z.array(z.object({ symbol: text(20), liquidity: z.number().min(0), impact: z.number().min(0) })).max(12),
      text: text(300),
    })
    .optional(),
  selection: z.array(z.object({ symbol: text(20), name: text(60).optional(), text: text(300) })).max(12).default([]),
  sources: z.array(z.object({ name: text(40), title: text(120), url: z.string().url().max(500).optional(), note: text(80).optional() })).max(8).default([]),
  notes: z.array(text(300)).max(8).default([]),
  notebook: z.object({ title: text(100), url: z.string().url().max(500) }),
  // A short, specific name for the strategy that fits the idea, chosen by whoever did the research; replaces the made-up one, never the person's own
  name: text(60).optional(),
  // The block of that notebook each part of the report is built from, by the part's id: what a link from that part of the report opens
  blocks: z.record(z.enum(SECTION_IDS), z.string().min(1).max(100)).optional(),
  dataNote: text(200).optional(),
  isExample: z.boolean().default(false),
})
