import { PiArrowUpRight } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { SourceMark } from "@/components/SourceLink/SourceMark"
import { Card } from "@/components/ui/card"
import { InfoTip } from "@/components/ui/info-tip"
import type { ResearchResult } from "@/lib/research/result"
import { cn } from "@/lib/utils"

import { Lines } from "./Lines"
import { WhatIf } from "./WhatIf"

type Chart = ResearchResult["charts"][number]
type Tone = "good" | "warn" | "bad"

const SHOWN_CHECKS = 4

const TONE_PILL: Record<Tone, string> = {
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300",
  bad: "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300",
}
const TONE_DOT: Record<Tone, string> = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500" }

const dollars = (amount: number) => (amount >= 1_000_000 ? `$${(amount / 1_000_000).toFixed(1)}M` : `$${Math.round(amount / 1000)}K`)

function Heading({ n, title, tip, link }: { n: string; title: string; tip?: string; link?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <span className="text-ink-300 text-xs tabular-nums">{n}</span>
        {title}
        {tip && <InfoTip label={title}>{tip}</InfoTip>}
      </h2>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-ink-400 hover:text-ink-100 text-xs transition-colors">
          View source ↗
        </a>
      )}
    </div>
  )
}

function ChartCard({ n, chart, link, tip }: { n: string; chart: Chart; link?: string; tip: string }) {
  return (
    <Card className="flex flex-col gap-3 p-4 md:p-5">
      <Heading n={n} title={chart.title} tip={tip} link={link} />
      <Lines title={chart.title} format={chart.format} series={chart.series} mark={chart.mark} />
    </Card>
  )
}

// What research found, laid out for someone deciding whether to buy: the answer, the four numbers that matter most to them, a calculator to
// try their own money, then the risks and what it would take to buy. The full work is in the notebooks on Sandworm, and each section says
// which one it came from.
export function ResearchResultView({ result, amount }: { result: ResearchResult; amount: number }) {
  // Sections are numbered as a report's are, in the order they come
  let count = 0
  const next = () => String(++count).padStart(2, "0")
  const { headline, summary, verdict, metrics, charts, checks, holdings, tradability, selection, sources, notebooks, dataNote, isExample } = result
  const linkOf = (title?: string) => notebooks.find((notebook) => notebook.title === title)?.url
  const growth = charts.find(({ kind }) => kind === "growth")
  const drop = charts.find(({ kind }) => kind === "drop")
  const [strategy, bench] = growth?.series ?? []
  const points =
    strategy && bench ? strategy.points.map(({ label, value }, i) => ({ label, strategy: value, bench: bench.points[i]?.value ?? value })) : []

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2.5">
        <h2 className="text-2xl font-medium tracking-tight md:text-[28px] md:leading-9">{headline}</h2>
        {verdict && (
          <p>
            <span className={cn("inline-flex rounded-full border px-3 py-1 text-sm font-medium", TONE_PILL[verdict.tone])}>{verdict.label}</span>
          </p>
        )}
        <p className="text-ink-400 max-w-2xl text-[15px] leading-6">{summary}</p>
        {isExample && (
          <p role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px] leading-5 text-amber-900 dark:text-amber-300">
            <strong className="font-medium">Test data.</strong> These numbers are made up to try the connection. They say nothing about this strategy.
          </p>
        )}
      </header>

      {metrics.length > 0 && (
        <div data-tour="results-metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(({ label, value, note, help }) => (
            <Card key={label} className="flex flex-col gap-0.5 rounded-[14px] px-[18px] py-4">
              <span className="text-ink-200 flex items-center gap-1.5 text-xs font-medium">
                {label}
                {help && <InfoTip label={label}>{help}</InfoTip>}
              </span>
              <span className="text-[28px] leading-9 font-medium tabular-nums">{value}</span>
              {note && <span className="text-ink-400 text-xs">{note}</span>}
            </Card>
          ))}
        </div>
      )}

      {points.length > 1 && (
        <div className="print:hidden">
          <WhatIf points={points} amount={amount} year={result.yearRange} />
        </div>
      )}
      {points.length > 1 && (
        <p className="hidden text-sm print:block">
          If you had put {amount.toLocaleString("en-US")} USDC in at the start of the test, you would have had{" "}
          {Math.round((amount * (points.at(-1)?.strategy ?? 1)) / (points[0]?.strategy ?? 1)).toLocaleString("en-US")} USDC at the end, against{" "}
          {Math.round((amount * (points.at(-1)?.bench ?? 1)) / (points[0]?.bench ?? 1)).toLocaleString("en-US")} USDC in the S&P 500.
        </p>
      )}

      {checks.length > 0 && (
        <Card className="flex flex-col gap-3 p-4 md:p-5">
          <Heading n={next()} title="What the numbers say" tip="Each line is worked out from the notebooks' numbers and from what you asked for. Amber and red lines are the ones to read twice." />
          <ul className="flex flex-col gap-2.5">
            {checks.slice(0, SHOWN_CHECKS).map(({ tone, text }) => (
              <li key={text} className="flex gap-2.5 text-sm leading-5">
                <span aria-hidden="true" className={cn("mt-1.5 size-2 flex-none rounded-full", TONE_DOT[tone])} />
                {text}
              </li>
            ))}
          </ul>
          {checks.length > SHOWN_CHECKS && (
            <ul className="hidden flex-col gap-2.5 print:flex">
              {checks.slice(SHOWN_CHECKS).map(({ tone, text }) => (
                <li key={text} className="flex gap-2.5 text-sm leading-5">
                  <span aria-hidden="true" className={cn("mt-1.5 size-2 flex-none rounded-full", TONE_DOT[tone])} />
                  {text}
                </li>
              ))}
            </ul>
          )}
          {checks.length > SHOWN_CHECKS && (
            <details className="group print:hidden">
              <summary className="text-ink-400 hover:text-ink-100 cursor-pointer text-xs">Show {checks.length - SHOWN_CHECKS} more</summary>
              <ul className="mt-2.5 flex flex-col gap-2.5">
                {checks.slice(SHOWN_CHECKS).map(({ tone, text }) => (
                  <li key={text} className="flex gap-2.5 text-sm leading-5">
                    <span aria-hidden="true" className={cn("mt-1.5 size-2 flex-none rounded-full", TONE_DOT[tone])} />
                    {text}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}

      {growth && (
        <ChartCard
          n={next()}
          chart={growth}
          link={linkOf(growth.notebook)}
          tip="What 1 USDC put in on the first day would have grown to, next to the same money in the S&P 500. The further apart the lines, the bigger the difference."
        />
      )}
      {drop && (
        <ChartCard
          n={next()}
          chart={drop}
          link={linkOf(drop.notebook)}
          tip="How far below its highest point the value was on each day. Deep dips are the times it would have felt worst. The dashed line is the loss you said you'd panic at."
        />
      )}

      {holdings.length > 0 && (
        <Card className="flex flex-col gap-3 p-4 md:p-5">
          <Heading
            n={next()}
            title="Where the risk sits"
            tip="Money is how much you put in each stock. Share of the risk is how much of the ups and downs each one causes. A stock with more risk than money is the one moving your result."
            link={linkOf("Risk")}
          />
          <ul className="flex flex-col gap-3">
            {holdings.map(({ symbol, weight, riskShare }) => (
              <li key={symbol} className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">{symbol}</span>
                {(
                  [
                    ["Money", weight, "bg-ink-300"],
                    ["Risk", riskShare, "bg-mark"],
                  ] as const
                ).map(([label, share, color]) => (
                  <span key={label} className="flex items-center gap-2 text-xs">
                    <span className="text-ink-400 w-10">{label}</span>
                    <span className="bg-hover-bg h-1.5 flex-1 overflow-hidden rounded-full dark:bg-white/10">
                      <span className={cn("block h-full rounded-full", color)} style={{ width: `${Math.round(share * 100)}%` }} />
                    </span>
                    <span className="w-9 text-right tabular-nums">{Math.round(share * 100)}%</span>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tradability && (
        <Card className="flex flex-col gap-3 p-4 md:p-5">
          <Heading n={next()} title="Can it be bought" tip="A pool is where a token trades. A bigger pool means your order barely moves the price; a small one means you could pay noticeably more." />
          <p className="text-ink-400 text-sm leading-5">{tradability.text}</p>
          <table className="w-full text-sm">
            <thead className="text-ink-400 text-left text-xs">
              <tr>
                <th className="pb-2 font-medium">Token</th>
                <th className="pb-2 font-medium">Pool</th>
                <th className="pb-2 font-medium">Your order moves the price</th>
              </tr>
            </thead>
            <tbody>
              {tradability.stocks.map(({ symbol, liquidity, impact }) => (
                <tr key={symbol} className="border-border-secondary dark:border-border-tertiary border-t">
                  <td className="py-2 font-medium">{symbol}</td>
                  <td className="py-2 tabular-nums">{dollars(liquidity)}</td>
                  <td className="py-2 tabular-nums">{(impact * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {selection.length > 0 && (
        <Card className="flex flex-col gap-3 p-4 md:p-5">
          <Heading n={next()} title="Why these stocks" tip="Each was picked to match what you asked for. The test shows how each behaved on its own, which is evidence about the past, not a reason to expect more of the same." link={linkOf("Risk")} />
          <ul className="flex flex-col gap-3">
            {selection.map(({ symbol, name, text }) => (
              <li key={symbol} className="flex flex-col gap-0.5 text-sm">
                <span className="font-medium">
                  {symbol}
                  {name && <span className="text-ink-400 font-normal"> · {name}</span>}
                </span>
                <span className="text-ink-400 leading-5">{text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="flex flex-col gap-3 p-4 md:p-5">
        <Heading n={next()} title="Sources" tip="Where each fact in this report came from. The Sandworm notebooks hold every calculation, so any number here can be opened and re-run." />
        <ol className="flex flex-col gap-2">
          {sources.map(({ name, title, url, note }, i) => (
            <li key={name} className="flex items-center gap-2.5 text-[13px]">
              <span className="text-ink-400 w-4 text-[11px] tabular-nums">{i + 1}</span>
              <SourceMark name={name} />
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                  {title}
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate">{title}</span>
              )}
              {note && <span className="text-ink-400 hidden text-xs sm:block">{note}</span>}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {notebooks.map(({ title, url }) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ intent: "outline", size: "compact" })}>
              Open the {title.toLowerCase()} notebook
              <PiArrowUpRight size={14} aria-hidden="true" />
            </a>
          ))}
        </div>
        {dataNote && <p className="text-ink-400 text-xs">{dataNote}</p>}
      </Card>
    </div>
  )
}
