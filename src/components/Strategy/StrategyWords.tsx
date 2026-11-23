import { explainStrategy, termsOf } from "@/lib/strategy/explain"
import type { Strategy } from "@/lib/strategy/types"
import { cn } from "@/lib/utils"

const TAG = "flex-none rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase"
const TAGS = {
  if: { word: "If", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  then: { word: "Then", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  else: { word: "Otherwise", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
} as const

// The strategy as a recipe: a line for each thing it does, set in under the "if" that leads to it, with what the technical
// words mean underneath. For someone who has never read a strategy.
export function StrategyWords({ strategy }: { strategy: Strategy }) {
  const { intro, steps } = explainStrategy(strategy)
  const terms = termsOf(strategy)

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[15px] leading-6">{intro}</p>

      <ol className="flex flex-col">
        {steps.map(({ depth, kind, text, share }, i) => {
          const tag = kind === "if" || kind === "then" || kind === "else" ? TAGS[kind] : undefined

          return (
            <li
              key={i}
              style={{ marginLeft: depth * 22 }}
              className={cn(
                "flex items-baseline gap-2.5 py-1.5 text-[15px] leading-6",
                depth > 0 && "border-border-secondary dark:border-border-tertiary border-l pl-3.5"
              )}
            >
              {tag && <span className={cn(TAG, tag.className)}>{tag.word}</span>}
              {share && (
                <span className={cn(TAG, "bg-hover-bg text-ink-100 normal-case tabular-nums dark:bg-white/10")}>
                  {share}
                </span>
              )}
              {text && <span className={kind === "split" ? "font-medium" : undefined}>{text}</span>}
            </li>
          )
        })}
      </ol>

      {terms.length > 0 && (
        <div className="bg-hover-bg flex flex-col gap-2 rounded-xl p-4 dark:bg-white/5">
          <h3 className="text-sm font-medium">What the words mean</h3>
          <dl className="flex flex-col gap-1.5">
            {terms.map(({ term, meaning }) => (
              <div key={term} className="text-[13px] leading-5">
                <dt className="inline font-medium">{term}</dt> <dd className="text-ink-400 inline">{meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
