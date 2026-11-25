"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Section } from "@/components/Rules/Section"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { exitsFirst } from "@/lib/rules/readings"
import { checkRules } from "@/lib/rules/spec"
import type { ModelDoc } from "@/lib/strategy/document"
import type { Stock } from "@/types/markets"
import type { Portfolio } from "@/types/portfolios"

import { ModelRules } from "./ModelRules"
import { StrategyCanvas } from "./StrategyCanvas"

type StrategyWorkbenchProps = {
  portfolio: Portfolio
  stocks: Pick<Stock, "symbol" | "liquidity" | "series">[]
  initial: ModelDoc
}

export function StrategyWorkbench({ portfolio, stocks, initial }: StrategyWorkbenchProps) {
  const [doc, setDoc] = useState(initial)
  const [view, setView] = useState<"words" | "diagram">("words")
  const [past, setPast] = useState<ModelDoc[]>([])
  const [future, setFuture] = useState<ModelDoc[]>([])

  const symbols = useMemo(() => stocks.map(({ symbol }) => symbol), [stocks])
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
