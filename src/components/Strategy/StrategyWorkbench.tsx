"use client"

import { useMemo, useRef, useState } from "react"
import { PiCaretDown, PiCheckCircle, PiWarningCircle } from "react-icons/pi"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { RuleReadings } from "@/components/Rules/RuleReadings"
import { RulesSummary } from "@/components/Rules/RulesSummary"
import { Section } from "@/components/Rules/Section"
import { SegmentedControl } from "@/components/ui/segmented-control"
import type { Stock } from "@/lib/markets/types"
import type { Portfolio } from "@/lib/portfolios/types"
import { checkRules } from "@/lib/rules/spec"
import { type ModelDoc, parseModel, serializeModel } from "@/lib/strategy/document"
import { cn } from "@/lib/utils"

import { BlockPalette } from "./BlockPalette"
import { RulesDiagram } from "./RulesDiagram"
import { StrategyCanvas } from "./StrategyCanvas"
import { StrategyWords } from "./StrategyWords"

const BUTTON = buttonVariants({ intent: "outline", size: "compact" })

type StrategyWorkbenchProps = {
  portfolio: Portfolio
  stocks: Pick<Stock, "symbol" | "liquidity">[]
  initial: ModelDoc
  lockedAt?: string
  checkedAt?: string
}

// The model, said three ways that never disagree because they are all drawn from one piece of JSON: what it does, in plain
// words or as blocks; the rules it follows, as a list or as the path a trade takes; and, tucked away, the JSON itself, which
// can be edited. A mistake in the JSON is said in words and the page stays on the last model that was right.
export function StrategyWorkbench({ portfolio, stocks, initial, lockedAt, checkedAt }: StrategyWorkbenchProps) {
  const [text, setText] = useState(() => serializeModel(initial))
  const [doingView, setDoingView] = useState<"words" | "blocks">("words")
  const [rulesView, setRulesView] = useState<"status" | "path">("status")
  const parsed = useMemo(() => parseModel(text), [text])
  const lastRight = useRef(initial)
  if (parsed.ok) lastRight.current = parsed.doc
  const doc = parsed.ok ? parsed.doc : lastRight.current

  const readings = useMemo(() => checkRules(portfolio, doc.rules, stocks), [portfolio, doc.rules, stocks])
  const passing = readings.filter(({ rule }) => rule.state === "holds").length

  const copy = () =>
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied the JSON"))
      .catch(() => toast.error("Could not copy"))

  return (
    <div className="flex flex-col gap-4">
      <RulesSummary
        passing={passing}
        total={readings.length}
        lockedAt={lockedAt}
        checkedAt={checkedAt}
        portfolioId={portfolio.id}
      />

      <Section
        title="What it does"
        description="Read it like a recipe. The diagram shows the same thing as blocks."
        actions={
          <SegmentedControl
            label="How to show what it does"
            value={doingView}
            onChange={setDoingView}
            options={[
              { value: "words", label: "In words" },
              { value: "blocks", label: "Diagram" },
            ]}
          />
        }
      >
        {doingView === "words" ? <StrategyWords strategy={doc.strategy} /> : <StrategyCanvas strategy={doc.strategy} />}
      </Section>

      <Section
        title="The rules it follows"
        description="Limits it can't break. Every trade is checked against all of them before it is placed."
        actions={
          <SegmentedControl
            label="How to show the rules"
            value={rulesView}
            onChange={setRulesView}
            options={[
              { value: "status", label: "Where they stand" },
              { value: "path", label: "How a trade is checked" },
            ]}
          />
        }
      >
        {rulesView === "status" ? (
          <RuleReadings readings={readings} />
        ) : (
          <RulesDiagram readings={readings} strategyName={doc.strategy.name} />
        )}
      </Section>

      <details className="group bg-block-surface border-border-secondary dark:border-border-tertiary rounded-[14px] border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 md:px-6 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col gap-1">
            <span className="text-[19px] leading-tight font-medium">Advanced</span>
            <span className="text-ink-400 text-sm">
              Edit this model as JSON, and see every block you can build with.
            </span>
          </span>
          <PiCaretDown aria-hidden="true" size={18} className="flex-none transition-transform group-open:rotate-180" />
        </summary>

        <div className="flex flex-col gap-8 px-4 pb-5 md:px-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink-400 text-sm">
                This is all that is saved. Edit it, or paste one in, and everything above follows.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => parsed.ok && setText(serializeModel(parsed.doc))}
                  disabled={!parsed.ok}
                  className={cn(BUTTON, "disabled:opacity-40")}
                >
                  Format
                </button>
                <button type="button" onClick={() => setText(serializeModel(initial))} className={BUTTON}>
                  Reset
                </button>
                <button type="button" onClick={copy} className={BUTTON}>
                  Copy
                </button>
              </div>
            </div>
            <textarea
              aria-label="Model JSON"
              aria-invalid={!parsed.ok}
              spellCheck={false}
              value={text}
              onChange={(event) => setText(event.target.value)}
              className={cn(
                "bg-hover-bg/50 h-96 w-full resize-y rounded-xl border p-3 font-mono text-xs leading-5 transition-colors outline-none dark:bg-white/[0.03]",
                parsed.ok ? "border-border-secondary dark:border-border-tertiary focus:border-mark" : "border-red-500"
              )}
            />
            <p
              role={parsed.ok ? "status" : "alert"}
              className={cn(
                "flex items-start gap-1.5 text-xs",
                parsed.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}
            >
              {parsed.ok ? (
                <PiCheckCircle aria-hidden="true" size={14} className="mt-px flex-none" />
              ) : (
                <PiWarningCircle aria-hidden="true" size={14} className="mt-px flex-none" />
              )}
              {parsed.ok
                ? "Valid. Everything above is drawn from this."
                : `${parsed.error}. The page still shows the last model that was right.`}
            </p>
          </div>
          <BlockPalette />
        </div>
      </details>
    </div>
  )
}
