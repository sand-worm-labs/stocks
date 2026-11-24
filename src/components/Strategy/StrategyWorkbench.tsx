"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Section } from "@/components/Rules/Section"
import { SegmentedControl } from "@/components/ui/segmented-control"
import type { Stock } from "@/lib/markets/types"
import type { Portfolio } from "@/lib/portfolios/types"
import { exitsFirst } from "@/lib/rules/readings"
import { checkRules } from "@/lib/rules/spec"
import type { ModelDoc } from "@/lib/strategy/document"

import { ModelRules } from "./ModelRules"
import { StrategyCanvas } from "./StrategyCanvas"

type StrategyWorkbenchProps = {
  portfolio: Portfolio
  stocks: Pick<Stock, "symbol" | "liquidity" | "series">[]
  initial: ModelDoc
}

// The model, said two ways that never disagree because they are both drawn from the same data: one set of rules, in plain
// words or as a diagram.
export function StrategyWorkbench({ portfolio, stocks, initial }: StrategyWorkbenchProps) {
  const [doc, setDoc] = useState(initial)
  const [view, setView] = useState<"words" | "diagram">("words")
  // What the diagram has changed, so a change can be taken back: the models before it, and the ones taken back from
  const [past, setPast] = useState<ModelDoc[]>([])
  const [future, setFuture] = useState<ModelDoc[]>([])

  const symbols = useMemo(() => stocks.map(({ symbol }) => symbol), [stocks])
  // How it gets out of a stock comes first, in the words and on the board
  const readings = useMemo(() => exitsFirst(checkRules(portfolio, doc.rules, stocks)), [portfolio, doc.rules, stocks])

  const change = (next: ModelDoc) => {
    setPast((all) => [...all.slice(-99), doc])
    setFuture([])
    setDoc(next)
  }
  const undo = useCallback(() => {
    const previous = past.at(-1)
    if (!previous) return
    setPast(past.slice(0, -1))
    setFuture((all) => [doc, ...all])
    setDoc(previous)
  }, [past, doc])
  const redo = useCallback(() => {
    const next = future[0]
    if (!next) return
    setFuture(future.slice(1))
    setPast((all) => [...all, doc])
    setDoc(next)
  }, [future, doc])

  // Ctrl or Cmd Z takes back the last change made in the diagram, and with Shift (or Ctrl Y) puts it back. Inside a field the
  // keys are left to the field, which has its own undo.
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
            onChange={(strategy) => change({ ...doc, strategy })}
          />
        )}
      </Section>
    </div>
  )
}
