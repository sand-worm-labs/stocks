import { PiArrowUpRight } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { Card } from "@/components/ui/card"
import type { ResearchResult } from "@/lib/research/result"
import { cn } from "@/lib/utils"

type Chart = ResearchResult["charts"][number]
type Tone = "good" | "warn" | "bad"

const WIDTH = 600
const HEIGHT = 200

const TONE_PILL: Record<Tone, string> = {
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300",
  bad: "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300",
}
const TONE_DOT: Record<Tone, string> = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500" }

const show = (value: number, format: Chart["format"]) =>
  format === "percent" ? `${value.toFixed(0)}%` : format === "currency" ? `$${value.toFixed(0)}` : `${value.toFixed(2)}×`

// Lines over time, drawn plainly, with the level worth watching as a dashed line. Anything finer is in the notebook it came from.
function Lines({ chart, link }: { chart: Chart; link?: string }) {
  const { title, format, series, mark } = chart
  const values = [...series.flatMap(({ points }) => points.map(({ value }) => value)), ...(mark ? [mark.value] : [])]
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = high - low || 1
  const y = (value: number) => HEIGHT - ((value - low) / span) * (HEIGHT - 12) - 6
  const first = series[0]?.points
  const x = (i: number, count: number) => (i / Math.max(count - 1, 1)) * WIDTH

  return (
    <Card className="flex flex-col gap-3 p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-400 hover:text-ink-100 text-xs transition-colors"
          >
            View source ↗
          </a>
        )}
      </div>
      <ul className="text-ink-400 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map(({ name }, i) => (
          <li key={name} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("h-0.5 w-4 rounded-full", i === 0 ? "bg-mark" : "bg-ink-300")} />
            {name}
          </li>
        ))}
        {mark && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="border-ink-300 w-4 border-t border-dashed" />
            {mark.label}
          </li>
        )}
      </ul>
      <svg role="img" aria-label={title} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full">
        {mark && (
          <line
            x1={0}
            x2={WIDTH}
            y1={y(mark.value)}
            y2={y(mark.value)}
            className="text-ink-300"
            stroke="currentColor"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {series.map(({ name, points }, i) => (
          <polyline
            key={name}
            points={points.map(({ value }, at) => `${x(at, points.length)},${y(value)}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={i === 0 ? "text-mark" : "text-ink-300"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="text-ink-400 flex justify-between text-xs tabular-nums">
        <span>{first?.at(0)?.label}</span>
        <span>
          {show(low, format)} to {show(high, format)}
        </span>
        <span>{first?.at(-1)?.label}</span>
      </div>
    </Card>
  )
}

// What research found, small: the answer, the numbers behind it, two charts, and where to open the whole of it. The work itself is in the
// notebooks on Sandworm, each number of it can be read there, and each chart says which notebook it is drawn in.
export function ResearchResultView({ result, eyebrow }: { result: ResearchResult; eyebrow: string }) {
  const { headline, summary, verdict, metrics, charts, checks, holdings, notebooks, dataNote, isExample } = result
  const linkOf = (title?: string) => notebooks.find((notebook) => notebook.title === title)?.url

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2.5">
        <p className="text-ink-200 text-xs font-medium tracking-[0.08em] uppercase">{eyebrow}</p>
        <h1 className="text-2xl font-medium tracking-tight md:text-[30px] md:leading-[38px]">{headline}</h1>
        {verdict && (
          <p>
            <span
              className={cn("inline-flex rounded-full border px-3 py-1 text-sm font-medium", TONE_PILL[verdict.tone])}
            >
              {verdict.label}
            </span>
          </p>
        )}
        <p className="text-ink-400 max-w-2xl text-[15px] leading-6">{summary}</p>
        {isExample && (
          <p
            role="note"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px] leading-5 text-amber-900 dark:text-amber-300"
          >
            <strong className="font-medium">Test data.</strong> These numbers are made up to try the connection. They say
            nothing about this strategy.
          </p>
        )}
      </header>

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(({ label, value, note }) => (
            <Card key={label} className="flex flex-col gap-0.5 rounded-[14px] px-[18px] py-4">
              <span className="text-ink-200 text-xs font-medium">{label}</span>
              <span className="text-[28px] leading-9 font-medium tabular-nums">{value}</span>
              {note && <span className="text-ink-400 text-xs">{note}</span>}
            </Card>
          ))}
        </div>
      )}

      {checks.length > 0 && (
        <Card className="flex flex-col gap-3 p-4 md:p-5">
          <h2 className="text-sm font-medium">What the numbers say</h2>
          <ul className="flex flex-col gap-2.5">
            {checks.map(({ tone, text }) => (
              <li key={text} className="flex gap-2.5 text-sm leading-5">
                <span aria-hidden="true" className={cn("mt-1.5 size-2 flex-none rounded-full", TONE_DOT[tone])} />
                {text}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {charts.map((chart) => (
        <Lines key={chart.title} chart={chart} link={linkOf(chart.notebook)} />
      ))}

      {holdings.length > 0 && (
        <Card className="flex flex-col gap-3 p-4 md:p-5">
          <h2 className="text-sm font-medium">Money and risk, by stock</h2>
          <table className="w-full text-sm">
            <thead className="text-ink-400 text-left text-xs">
              <tr>
                <th className="pb-2 font-medium">Stock</th>
                <th className="pb-2 font-medium">Money</th>
                <th className="pb-2 font-medium">Share of the risk</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(({ symbol, weight, riskShare }) => (
                <tr key={symbol} className="border-border-secondary dark:border-border-tertiary border-t">
                  <td className="py-2 font-medium">{symbol}</td>
                  <td className="py-2 tabular-nums">{Math.round(weight * 100)}%</td>
                  <td className="py-2 tabular-nums">{Math.round(riskShare * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="flex flex-col gap-3 p-4 md:p-5">
        <h2 className="text-sm font-medium">Open the full work on Sandworm</h2>
        <div className="flex flex-wrap gap-2">
          {notebooks.map(({ title, url }) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ intent: "outline", size: "compact" })}
            >
              {title}
              <PiArrowUpRight size={14} aria-hidden="true" />
            </a>
          ))}
        </div>
        {dataNote && <p className="text-ink-400 text-xs">{dataNote}</p>}
      </Card>
    </div>
  )
}
