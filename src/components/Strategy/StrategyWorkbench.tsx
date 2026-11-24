"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PiCaretDown, PiCheckCircle, PiWarningCircle } from "react-icons/pi"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { Section } from "@/components/Rules/Section"
import { SegmentedControl } from "@/components/ui/segmented-control"
import type { Stock } from "@/lib/markets/types"
import type { Portfolio } from "@/lib/portfolios/types"
import { checkRules } from "@/lib/rules/spec"
import { type ModelDoc, parseModel, serializeModel } from "@/lib/strategy/document"
import { cn } from "@/lib/utils"

import { BlockPalette } from "./BlockPalette"
import { ModelRules } from "./ModelRules"
import { StrategyCanvas } from "./StrategyCanvas"

const BUTTON = buttonVariants({ intent: "outline", size: "compact" })

type StrategyWorkbenchProps = {
  portfolio: Portfolio
  stocks: Pick<Stock, "symbol" | "liquidity" | "series">[]
  initial: ModelDoc
}

// The model, said two ways that never disagree because they are both drawn from one piece of JSON: one set of rules, in plain
// words or as a diagram; and, tucked away, the JSON itself, which can be edited. A mistake in the JSON is said in words and the page stays on the last model that was right.
export function StrategyWorkbench({ portfolio, stocks, initial }: StrategyWorkbenchProps) {
  const [text, setText] = useState(() => serializeModel(initial))
  const [view, setView] = useState<"words" | "diagram">("words")
  // What the diagram has changed, so a change can be taken back: the texts before it, and the ones taken back from
  const [past, setPast] = useState<string[]>([])
  const [future, setFuture] = useState<string[]>([])
  const parsed = useMemo(() => parseModel(text), [text])
  const lastRight = useRef(initial)
  if (parsed.ok) lastRight.current = parsed.doc
  const doc = parsed.ok ? parsed.doc : lastRight.current

  const symbols = useMemo(() => stocks.map(({ symbol }) => symbol), [stocks])
  const readings = useMemo(() => checkRules(portfolio, doc.rules, stocks), [portfolio, doc.rules, stocks])

  const change = (next: string) => {
    setPast((all) => [...all.slice(-99), text])
    setFuture([])
    setText(next)
  }
  const undo = useCallback(() => {
    const previous = past.at(-1)
    if (previous === undefined) return
    setPast(past.slice(0, -1))
    setFuture((all) => [text, ...all])
    setText(previous)
  }, [past, text])
  const redo = useCallback(() => {
    const next = future[0]
    if (next === undefined) return
    setFuture(future.slice(1))
    setPast((all) => [...all, text])
    setText(next)
  }, [future, text])

  // Ctrl or Cmd Z takes back the last change made in the diagram, and with Shift (or Ctrl Y) puts it back. Inside the JSON box
  // the keys are left to the box, which has its own undo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key !== "z" && key !== "y") return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))
      )
        return
      event.preventDefault()
      if (key === "y" || event.shiftKey) redo()
      else undo()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo])

  const copy = () =>
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied the JSON"))
      .catch(() => toast.error("Could not copy"))

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Rules"
        description="Everything this strategy does, as one set of rules. Nothing is bought or sold unless every rule holds."
        actions={
          <SegmentedControl
            label="How to show the rules"
            value={view}
            onChange={setView}
            options={[
              { value: "words", label: "In words" },
              { value: "diagram", label: "Diagram" },
            ]}
          />
        }
      >
        {view === "words" ? (
          <ModelRules strategy={doc.strategy} readings={readings} />
        ) : (
          <StrategyCanvas
            strategy={doc.strategy}
            symbols={symbols}
            readings={readings}
            // While the JSON is wrong, the canvas shows the last model that was right, and a change here would write over what
            // is being fixed
            onChange={parsed.ok ? (strategy) => change(serializeModel({ ...doc, strategy })) : undefined}
            history={
              parsed.ok
                ? { onUndo: undo, onRedo: redo, canUndo: past.length > 0, canRedo: future.length > 0 }
                : undefined
            }
          />
        )}
      </Section>

      <details className="group bg-block-surface border-border-secondary dark:border-border-tertiary rounded-[14px] border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 md:px-6 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col gap-1">
            <span className="text-[19px] leading-tight font-medium">Advanced</span>
            <span className="text-ink-400 text-sm">
              Edit this strategy as JSON, and see every block you can build with.
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
              aria-label="Strategy JSON"
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
                : `${parsed.error}. The page still shows the last strategy that was right.`}
            </p>
          </div>
          <BlockPalette />
        </div>
      </details>
    </div>
  )
}
