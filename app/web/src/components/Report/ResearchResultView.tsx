import type { ComponentType, ReactNode } from "react"
import {
  PiArrowUpRight,
  PiBooks,
  PiChartLineUp,
  PiCheckCircle,
  PiClipboardText,
  PiListChecks,
  PiShieldWarning,
  PiShoppingCartSimple,
  PiTrendDown,
  PiWarningCircle,
  PiXCircle,
} from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { ShareBars } from "@/components/Report/charts/ShareBars"
import { SourceLogo } from "@/components/SourceLink/SourceLogo"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { InfoTip } from "@/components/ui/info-tip"
import type { ResearchResult } from "@/lib/research/result"
import { cn } from "@/lib/utils"

import { Lines } from "./Lines"
import { ReportTable, ReportTableCell, ReportTableHead, ReportTableRow } from "./ReportTable"
import { WhatIf } from "./WhatIf"

type Chart = ResearchResult["charts"][number]
type Tone = "good" | "warn" | "bad"
type Icon = ComponentType<{ size?: number; "aria-hidden"?: boolean }>

const SHOWN_CHECKS = 4

const TONE_DOT: Record<Tone, string> = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500" }
const TONE_ICON: Record<Tone, { icon: Icon; color: string }> = {
  good: { icon: PiCheckCircle, color: "text-emerald-600" },
  warn: { icon: PiWarningCircle, color: "text-amber-600" },
  bad: { icon: PiXCircle, color: "text-red-600" },
}

const dollars = (amount: number) => (amount >= 1_000_000 ? `$${(amount / 1_000_000).toFixed(1)}M` : `$${Math.round(amount / 1000)}K`)

function Heading({ icon: Icon, title, tip, link }: { icon: Icon; title: string; tip?: string; link?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-base font-medium tracking-tight">
        <span aria-hidden="true" className="bg-inputBg text-ink-200 flex size-8 flex-none items-center justify-center rounded-lg">
          <Icon size={18} aria-hidden />
        </span>
        {title}
        {tip && <InfoTip label={title}>{tip}</InfoTip>}
      </h2>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-ink-400 hover:text-ink-100 text-xs whitespace-nowrap transition-colors">
          View source ↗
        </a>
      )}
    </div>
  )
}

function Section({ children }: { children: ReactNode }) {
  return <Card raised className="flex flex-col gap-4 p-5 md:p-6">{children}</Card>
}

function ChartSection({ icon, chart, link, tip, area }: { icon: Icon; chart: Chart; link?: string; tip: string; area?: boolean }) {
  return (
    <Section>
      <Heading icon={icon} title={chart.title} tip={tip} link={link} />
      <Lines title={chart.title} format={chart.format} series={chart.series} mark={chart.mark} area={area} />
    </Section>
  )
}

function CheckItem({ tone, text }: { tone: Tone; text: string }) {
  const { icon: Icon, color } = TONE_ICON[tone]
  return (
    <li className="flex gap-3 text-[15px] leading-6">
      <span className={cn("mt-0.5 flex-none", color)}>
        <Icon size={20} aria-hidden />
      </span>
      {text}
    </li>
  )
}

// What research found, laid out for someone deciding whether to buy: the answer, the four numbers that matter most to them, a calculator to
// try their own money, then the risks and what it would take to buy. The full work is in the one notebook on Sandworm, which each section links to.
export function ResearchResultView({ result, amount }: { result: ResearchResult; amount: number }) {
  const { headline, summary, verdict, metrics, charts, checks, holdings, tradability, selection, sources, notebook, dataNote, isExample } = result
  const growth = charts.find(({ kind }) => kind === "growth")
  const drop = charts.find(({ kind }) => kind === "drop")
  const [strategy, bench] = growth?.series ?? []
  const points =
    strategy && bench ? strategy.points.map(({ label, value }, i) => ({ label, strategy: value, bench: bench.points[i]?.value ?? value })) : []

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <h2 className="text-[28px] leading-9 font-semibold tracking-tight md:text-4xl md:leading-[44px]">{headline}</h2>
        {verdict && (
          <p className="flex items-center gap-2 text-base font-medium">
            <span aria-hidden="true" className={cn("size-2.5 flex-none rounded-full", TONE_DOT[verdict.tone])} />
            {verdict.label}
          </p>
        )}
        <p className="text-ink-200 max-w-2xl text-base leading-7">{summary}</p>
        {isExample && (
          <p role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px] leading-5 text-amber-900">
            <strong className="font-medium">Test data.</strong> These numbers are made up to try the connection. They say nothing about this strategy.
          </p>
        )}
      </header>

      {metrics.length > 0 && (
        <div data-tour="results-metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(({ label, value, note, help }) => (
            <Card raised key={label} className="flex flex-col gap-1 rounded-[14px] px-[18px] py-4">
              <span className="text-ink-200 flex items-center gap-1.5 text-[13px] font-medium">
                {label}
                {help && <InfoTip label={label}>{help}</InfoTip>}
              </span>
              <span className="text-[30px] leading-9 font-semibold tracking-tight tabular-nums">{value}</span>
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
        <Section>
          <Heading icon={PiClipboardText} title="What the numbers say" tip="Each line is worked out from the notebook's numbers and from what you asked for. Amber and red lines are the ones to read twice." />
          <ul className="flex flex-col gap-3">
            {checks.slice(0, SHOWN_CHECKS).map(({ tone, text }) => (
              <CheckItem key={text} tone={tone} text={text} />
            ))}
          </ul>
          {checks.length > SHOWN_CHECKS && (
            <ul className="hidden flex-col gap-3 print:flex">
              {checks.slice(SHOWN_CHECKS).map(({ tone, text }) => (
                <CheckItem key={text} tone={tone} text={text} />
              ))}
            </ul>
          )}
          {checks.length > SHOWN_CHECKS && (
            <details className="group print:hidden">
              <summary className="text-ink-400 hover:text-ink-100 cursor-pointer text-[13px]">Show {checks.length - SHOWN_CHECKS} more</summary>
              <ul className="mt-3 flex flex-col gap-3">
                {checks.slice(SHOWN_CHECKS).map(({ tone, text }) => (
                  <CheckItem key={text} tone={tone} text={text} />
                ))}
              </ul>
            </details>
          )}
        </Section>
      )}

      {growth && (
        <ChartSection
          icon={PiChartLineUp}
          chart={growth}
          link={notebook.url}
          tip="What 1 USDC put in on the first day would have grown to, next to the same money in the S&P 500. The further apart the lines, the bigger the difference."
        />
      )}
      {drop && (
        <ChartSection
          icon={PiTrendDown}
          area
          chart={drop}
          link={notebook.url}
          tip="How far below its highest point the value was on each day. Deep dips are the times it would have felt worst. The dotted line is the loss you said you'd panic at."
        />
      )}

      {holdings.length > 0 && (
        <Section>
          <Heading
            icon={PiShieldWarning}
            title="Where the risk sits"
            tip="Money is how much you put in each stock. Share of the risk is how much of the ups and downs each one causes. A stock with more risk than money is the one moving your result."
            link={notebook.url}
          />
          <ShareBars holdings={holdings} />
        </Section>
      )}

      {tradability && (
        <Section>
          <Heading icon={PiShoppingCartSimple} title="Can it be bought" tip="A pool is where a token trades. A bigger pool means your order barely moves the price; a small one means you could pay noticeably more." />
          <p className="text-ink-200 text-[15px] leading-6">{tradability.text}</p>
          <ReportTable>
            <thead>
              <ReportTableRow>
                <ReportTableHead>Token</ReportTableHead>
                <ReportTableHead className="text-right">Pool</ReportTableHead>
                <ReportTableHead className="text-right">Your order moves the price</ReportTableHead>
              </ReportTableRow>
            </thead>
            <tbody>
              {tradability.stocks.map(({ symbol, liquidity, impact }) => (
                <ReportTableRow key={symbol}>
                  <ReportTableCell>
                    <span className="flex items-center gap-2.5 font-medium">
                      <StockAvatar symbol={symbol} className="size-7" />
                      {symbol}
                    </span>
                  </ReportTableCell>
                  <ReportTableCell className="text-right tabular-nums">{dollars(liquidity)}</ReportTableCell>
                  <ReportTableCell className="text-right tabular-nums">{(impact * 100).toFixed(2)}%</ReportTableCell>
                </ReportTableRow>
              ))}
            </tbody>
          </ReportTable>
        </Section>
      )}

      {selection.length > 0 && (
        <Section>
          <Heading icon={PiListChecks} title="Why these stocks" tip="Each was picked to match what you asked for. The test shows how each behaved on its own, which is evidence about the past, not a reason to expect more of the same." link={notebook.url} />
          <ReportTable>
            <thead>
              <ReportTableRow>
                <ReportTableHead>Stock</ReportTableHead>
                <ReportTableHead>Why it is in</ReportTableHead>
              </ReportTableRow>
            </thead>
            <tbody>
              {selection.map(({ symbol, name, text }) => (
                <ReportTableRow key={symbol}>
                  <ReportTableCell className="w-48 align-top">
                    <span className="flex items-center gap-2.5">
                      <StockAvatar symbol={symbol} className="size-7" />
                      <span className="flex flex-col leading-5">
                        <span className="font-medium">{symbol}</span>
                        {name && <span className="text-ink-400 text-xs">{name}</span>}
                      </span>
                    </span>
                  </ReportTableCell>
                  <ReportTableCell className="text-ink-200 leading-6 whitespace-normal">{text}</ReportTableCell>
                </ReportTableRow>
              ))}
            </tbody>
          </ReportTable>
        </Section>
      )}

      <Section>
        <Heading icon={PiBooks} title="Sources" tip="Where each fact in this report came from. The Sandworm notebook holds every calculation, so any number here can be opened and re-run." />
        <ReportTable>
          <thead>
            <ReportTableRow>
              <ReportTableHead>Source</ReportTableHead>
              <ReportTableHead>What it was used for</ReportTableHead>
            </ReportTableRow>
          </thead>
          <tbody>
            {sources.map(({ name, title, url, note }) => (
              <ReportTableRow key={name}>
                <ReportTableCell className="w-56 align-top">
                  <span className="flex items-center gap-2.5 font-medium">
                    <SourceLogo name={name} url={url} />
                    {name}
                  </span>
                </ReportTableCell>
                <ReportTableCell className="leading-6 whitespace-normal">
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {title}
                    </a>
                  ) : (
                    title
                  )}
                  {note && <span className="text-ink-400 block text-xs">{note}</span>}
                </ReportTableCell>
              </ReportTableRow>
            ))}
          </tbody>
        </ReportTable>
        <div className="flex flex-wrap items-center gap-2">
          <a href={notebook.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ intent: "outline", size: "compact" })}>
            Open the research notebook
            <PiArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
        {dataNote && <p className="text-ink-400 text-xs">{dataNote}</p>}
      </Section>
    </div>
  )
}
