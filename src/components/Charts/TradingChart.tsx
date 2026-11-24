"use client"

import {
  AreaSeries,
  ColorType,
  createChart,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  LineStyle,
  type MouseEventParams,
  TickMarkType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts"
import { useTheme } from "next-themes"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"

import { BenchmarkPicker } from "@/components/Charts/BenchmarkPicker"
import { ChartLoader } from "@/components/Charts/ChartLoader"
import { ChartTooltip, type TooltipRow } from "@/components/Charts/ChartTooltip"
import { Pill } from "@/components/ui/pill"
import { useInView } from "@/hooks/use-in-view"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import type { BenchmarkLine } from "@/lib/benchmarks/compare"
import { formatDay, formatTime } from "@/lib/dates"
import { formatAmount, formatPercent, formatSignedAmount } from "@/lib/format"
import { changeOver, type ValuePoint } from "@/lib/portfolios/performance"

// The portfolio's own line: violet by day, white by night, where violet doesn't read
const ACCENT = {
  light: { line: "#7F56D9", top: "rgba(127, 86, 217, 0.32)", bottom: "rgba(127, 86, 217, 0)", label: "#7F56D9" },
  dark: { line: "#FFFFFF", top: "rgba(255, 255, 255, 0.22)", bottom: "rgba(255, 255, 255, 0)", label: "#3a3a3a" },
}
// A fund takes the first colour no other one on the chart has, and keeps it while it stays
const LINE_COLORS = ["#64748b", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"]
// More than three lines is a tangle, so a fourth switched on pushes the oldest off
const MAX_COMPARED = 3
const DEFAULT_COMPARED = "SPY"
// The chart is wiped in from the left, over this long
const REVEAL_MS = 1100
// A fund's line draws itself in, or out, over this long; its chip opens or closes in a little less
const FUND_MS = 520
const CHIP_MS = 320
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
const HEIGHT = 280
const TOOLTIP_WIDTH = 224

const isoOf = (seconds: Time) => new Date(Number(seconds) * 1000).toISOString()
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// One comparison line on the chart. `progress` is how much of it is drawn, from none to all: it draws in from the left as it is
// added and back out as it is taken off, and the chart's scale follows what is showing, so nothing jumps.
type Fund = { series: ISeriesApi<"Line">; color: string; progress: number; wanted: boolean; frame?: number }

type Slot = { id: string; color: string }
// A chip on the row above the chart. It stays in place, closing, until its animation is done.
type Chip = Slot & { open: boolean; immediate?: boolean }

const withAlpha = (hex: string, alpha: number) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha.toFixed(3)})`
}

// Draws as much of a fund's line as its progress says, and as faint as it says
function drawFund(fund: Fund, values: number[] | undefined, times: UTCTimestamp[]) {
  const shown = Math.round(fund.progress * times.length)
  fund.series.setData(times.slice(0, shown).map((time, i) => ({ time, value: values?.[i] ?? 0 })))
  fund.series.applyOptions({ color: withAlpha(fund.color, Math.min(1, fund.progress * 1.8)) })
}

const defaultPicked = (lines: BenchmarkLine[]): Slot[] =>
  lines.some((line) => line.id === DEFAULT_COMPARED)
    ? [{ id: DEFAULT_COMPARED, color: LINE_COLORS[0] ?? "#64748b" }]
    : []

// A chip's place on the row, which opens as it comes and closes as it goes, taking the room it was using with it, so the chips beside
// it slide rather than jump
function ChipSlot({
  open,
  immediate,
  reduced,
  children,
}: {
  open: boolean
  immediate?: boolean
  reduced: boolean
  children: ReactNode
}) {
  const [arrived, setArrived] = useState(Boolean(immediate))

  useEffect(() => {
    if (arrived) return
    // Two frames, so the closed state has been drawn before it is opened
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setArrived(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [arrived])

  const shown = arrived && open
  return (
    <div
      style={{
        gridTemplateColumns: shown ? "1fr" : "0fr",
        opacity: shown ? 1 : 0,
        transition: reduced ? "none" : `grid-template-columns ${CHIP_MS}ms ${EASE}, opacity ${CHIP_MS}ms ease`,
      }}
      className="grid"
    >
      <div className="min-w-0 overflow-hidden">
        <div className="pr-2">{children}</div>
      </div>
    </div>
  )
}

type Tip = { x: number; y: number; width: number; title: string; rows: TooltipRow[]; footer?: string }

// `name` is what the line is called: "Portfolio" for one, "My portfolios" for all of them together
type TradingChartProps = { points: ValuePoint[]; lines: BenchmarkLine[]; label: string; name?: string }

// The portfolio's value against any of the index funds and ETFs, drawn with TradingView's chart library. The funds are
// picked from the chips above it, each held to the same start so the lines say who did better.
export function TradingChart({ points, lines, label, name = "Strategy" }: TradingChartProps) {
  const { resolvedTheme } = useTheme()
  const reduced = usePrefersReducedMotion()
  const [frame, inView] = useInView<HTMLDivElement>()
  const canvas = useRef<HTMLDivElement>(null)
  const [picked, setPicked] = useState<Slot[]>(() => defaultPicked(lines))
  const [chips, setChips] = useState<Chip[]>(() =>
    defaultPicked(lines).map((slot) => ({ ...slot, open: true, immediate: true }))
  )
  const [tip, setTip] = useState<Tip>()
  const [dot, setDot] = useState<{ x: number; y: number }>()
  // The chart is wiped in from the left once it is made, and the live dot comes when the line has got there
  const [wiped, setWiped] = useState(false)
  const [landed, setLanded] = useState(false)

  // The chart wants times that only go up, so two points on one second are moved a second apart
  const times = useMemo(() => {
    let last = 0
    return points.map(({ time }) => (last = Math.max(time, last + 1)) as UTCTimestamp)
  }, [points])

  const chart = useRef<IChartApi>(undefined)
  const area = useRef<ISeriesApi<"Area">>(undefined)
  const funds = useRef(new Map<string, Fund>())
  // Set when the chart has just been made, so the funds already picked are drawn at once and only a change after it is animated
  const fresh = useRef(true)
  // What the chart's callbacks should see, since they outlive a render
  const latest = useRef({ points, times, lines, name })
  latest.current = { points, times, lines, name }

  const colorOf = (id: string) => picked.find((slot) => slot.id === id)?.color ?? LINE_COLORS[0] ?? "#64748b"
  const colorOfRef = useRef(colorOf)
  colorOfRef.current = colorOf

  // Every line on the chart, with all its points
  const paint = () => {
    const { points: all, times: at, lines: known } = latest.current
    area.current?.setData(all.map((point, i) => ({ time: at[i] as UTCTimestamp, value: point.value })))
    funds.current.forEach((fund, id) => drawFund(fund, known.find((line) => line.id === id)?.values, at))
  }
  const paintRef = useRef(paint)
  paintRef.current = paint

  const placeDot = () => {
    const { points: all, times: at } = latest.current
    const x = chart.current?.timeScale().timeToCoordinate(at.at(-1) as UTCTimestamp)
    const y = area.current?.priceToCoordinate(all.at(-1)?.value ?? 0)
    // The same place again is no change, so it doesn't set the chart going round again
    setDot((current) =>
      x == null || y == null
        ? undefined
        : current && Math.abs(current.x - x) < 0.5 && Math.abs(current.y - y) < 0.5
          ? current
          : { x, y }
    )
  }
  const placeDotRef = useRef(placeDot)
  placeDotRef.current = placeDot

  // The chart itself: made when it first comes into view, and again if the theme or the points change
  useEffect(() => {
    const host = canvas.current
    if (!host || !inView || points.length < 2) return

    const dark = resolvedTheme === "dark"
    const accent = dark ? ACCENT.dark : ACCENT.light
    const biggest = Math.max(...points.map(({ value }) => value))
    const api = createChart(host, {
      autoSize: true,
      handleScroll: false,
      handleScale: false,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: cssVar("--ink-400"),
        fontFamily: "inherit",
        fontSize: 11,
        attributionLogo: true,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: dark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)", style: LineStyle.Dashed },
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.1 } },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        tickMarkFormatter: (time: Time, type: TickMarkType) =>
          type === TickMarkType.Time || type === TickMarkType.TimeWithSeconds
            ? formatTime(isoOf(time))
            : formatDay(isoOf(time)),
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: accent.line, style: LineStyle.Dashed, width: 1, labelBackgroundColor: accent.label },
        horzLine: { visible: false, labelVisible: false },
      },
      localization: {
        priceFormatter: (price: number) =>
          price.toLocaleString("en-US", { maximumFractionDigits: biggest >= 1000 ? 0 : 2 }),
        timeFormatter: (time: Time) => `${formatDay(isoOf(time))}, ${formatTime(isoOf(time))}`,
      },
    })
    const priceFormat = {
      type: "price" as const,
      precision: biggest >= 1000 ? 0 : 2,
      minMove: biggest >= 1000 ? 1 : 0.01,
    }

    const portfolio = api.addSeries(AreaSeries, {
      lineColor: accent.line,
      lineWidth: 3,
      topColor: accent.top,
      bottomColor: accent.bottom,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerRadius: 5,
      priceFormat,
    })
    chart.current = api
    area.current = portfolio
    funds.current = new Map()
    fresh.current = true
    paintRef.current()
    api.timeScale().fitContent()

    const onMove = (param: MouseEventParams<Time>) => {
      const index = param.time === undefined ? -1 : latest.current.times.indexOf(param.time as UTCTimestamp)
      const own = area.current ? (param.seriesData.get(area.current) as { value: number } | undefined) : undefined
      if (!param.point || index < 0 || !own) return setTip(undefined)

      const rows: TooltipRow[] = [
        { label: latest.current.name, value: `${formatAmount(own.value)} USDC`, color: accent.line },
      ]
      let against: { name: string; value: number } | undefined
      funds.current.forEach(({ series, wanted }, id) => {
        if (!wanted) return
        const datum = param.seriesData.get(series) as { value: number } | undefined
        const fund = latest.current.lines.find((line) => line.id === id)
        if (!datum || !fund) return
        rows.push({
          label: fund.name,
          value: `${formatAmount(datum.value)} USDC`,
          color: colorOfRef.current(id),
          dashed: true,
        })
        against ??= { name: fund.name, value: datum.value }
      })

      setTip({
        x: param.point.x,
        y: param.point.y,
        width: host.clientWidth,
        title: latest.current.points[index]?.label ?? "",
        rows,
        footer: against ? `${formatSignedAmount(own.value - against.value)} USDC against ${against.name}` : undefined,
      })
    }
    api.subscribeCrosshairMove(onMove)

    const settle = () => requestAnimationFrame(() => placeDotRef.current())
    const resize = new ResizeObserver(settle)
    resize.observe(host)

    const timers = reduced
      ? [setTimeout(() => (setWiped(true), setLanded(true), settle()), 0)]
      : [setTimeout(() => setWiped(true), 60), setTimeout(() => (setLanded(true), settle()), REVEAL_MS + 80)]

    return () => {
      timers.forEach(clearTimeout)
      resize.disconnect()
      api.unsubscribeCrosshairMove(onMove)
      funds.current.forEach(({ frame }) => frame && cancelAnimationFrame(frame))
      api.remove()
      chart.current = undefined
      area.current = undefined
      funds.current = new Map()
      setTip(undefined)
      setDot(undefined)
      setWiped(false)
      setLanded(false)
    }
  }, [inView, resolvedTheme, points.length, reduced])

  // Draws a fund's line in (`to` 1) or out (`to` 0), the scale following what is showing. Out, the line is taken off the chart when it has
  // gone. `instant` does it at once: for the first drawing of a chart, and for anyone who has asked for less motion.
  const slideFund = (id: string, to: 0 | 1, instant: boolean) => {
    const api = chart.current
    const fund = funds.current.get(id)
    if (!api || !fund) return
    if (fund.frame) cancelAnimationFrame(fund.frame)

    const render = () =>
      drawFund(fund, latest.current.lines.find((line) => line.id === id)?.values, latest.current.times)
    const finish = () => {
      fund.frame = undefined
      if (to === 0 && funds.current.get(id) === fund) {
        if (chart.current === api) api.removeSeries(fund.series)
        funds.current.delete(id)
      }
      placeDotRef.current()
    }

    if (instant) {
      fund.progress = to
      render()
      return finish()
    }

    const from = fund.progress
    const started = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - started) / FUND_MS, 1)
      fund.progress = from + (to - from) * (1 - (1 - t) ** 3)
      render()
      placeDotRef.current()
      if (t < 1) fund.frame = requestAnimationFrame(tick)
      else finish()
    }
    fund.frame = requestAnimationFrame(tick)
  }

  // The funds on the chart: each is drawn in when it is picked and out when it is taken off, and the ones that stay are left alone, so
  // switching one never redraws the rest
  useEffect(() => {
    const api = chart.current
    if (!api || !inView) return

    const biggest = Math.max(...points.map(({ value }) => value))
    const instant = fresh.current || reduced
    fresh.current = false

    for (const { id, color } of picked) {
      let fund = funds.current.get(id)
      if (!fund) {
        const series = api.addSeries(LineSeries, {
          color: withAlpha(color, instant ? 1 : 0),
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerRadius: 4,
          priceFormat: { type: "price", precision: biggest >= 1000 ? 0 : 2, minMove: biggest >= 1000 ? 1 : 0.01 },
        })
        fund = { series, color, progress: instant ? 1 : 0, wanted: true }
        funds.current.set(id, fund)
      }
      fund.wanted = true
      fund.color = color
      slideFund(id, 1, instant)
    }
    funds.current.forEach((fund, id) => {
      if (fund.wanted && !picked.some((slot) => slot.id === id)) {
        fund.wanted = false
        slideFund(id, 0, instant)
      }
    })
    requestAnimationFrame(() => placeDotRef.current())
  }, [inView, resolvedTheme, points.length, reduced, picked])

  // A new price moves the lines where they are: the data is set again, and the chart is not made again
  useEffect(() => {
    if (!chart.current) return
    paintRef.current()
    requestAnimationFrame(() => placeDotRef.current())
  }, [points, lines])

  const toggle = (id: string) => {
    let next: Slot[]
    if (picked.some((slot) => slot.id === id)) next = picked.filter((slot) => slot.id !== id)
    else {
      const kept = picked.length >= MAX_COMPARED ? picked.slice(1) : picked
      const color = LINE_COLORS.find((free) => !kept.some((slot) => slot.color === free)) ?? LINE_COLORS[0] ?? "#64748b"
      next = [...kept, { id, color }]
    }
    const gone = picked.filter((slot) => !next.some((other) => other.id === slot.id))
    const added = next.filter((slot) => !picked.some((other) => other.id === slot.id))

    setPicked(next)
    // A chip that goes closes where it is, and is taken off the row once it has; one that comes opens at the end
    setChips((current) => {
      const out = current.map((chip) => (gone.some((slot) => slot.id === chip.id) ? { ...chip, open: false } : chip))
      for (const slot of added) {
        const at = out.findIndex((chip) => chip.id === slot.id)
        if (at >= 0) out[at] = { ...out[at]!, color: slot.color, open: true }
        else out.push({ ...slot, open: false })
      }
      return out
    })
    if (gone.length) {
      setTimeout(
        () => setChips((current) => current.filter((chip) => chip.open || !gone.some((slot) => slot.id === chip.id))),
        CHIP_MS + 60
      )
    }
  }
  const own = changeOver(points)

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Compare the strategy with" className="flex flex-wrap items-center gap-2">
        <Pill dot="var(--color-primary)" detail={formatPercent(own, { signed: true })}>
          {name}
        </Pill>
        <span className="text-ink-400 text-xs">vs</span>
        <div className="flex flex-wrap items-center">
          {chips.map(({ id, color, open, immediate }) => {
            const line = lines.find((other) => other.id === id)
            if (!line) return null

            return (
              <ChipSlot key={id} open={open} immediate={immediate} reduced={reduced}>
                <Pill
                  dot={color}
                  title={line.fund}
                  detail={formatPercent(line.change, { signed: true })}
                  onRemove={() => toggle(id)}
                >
                  {line.name}
                </Pill>
              </ChipSlot>
            )
          })}
        </div>
        <BenchmarkPicker lines={lines} picked={picked} max={MAX_COMPARED} onToggle={toggle} />
      </div>

      <div
        ref={frame}
        role="img"
        aria-label={label}
        style={{ height: HEIGHT }}
        className="relative w-full outline-none select-none [-webkit-tap-highlight-color:transparent]"
      >
        <div
          ref={canvas}
          style={{
            clipPath: wiped ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
            transition: reduced ? "none" : `clip-path ${REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
          className="absolute inset-0"
        />
        {points.length < 2 ? (
          <p className="text-ink-400 absolute inset-0 flex items-center justify-center text-sm">
            Not enough history to draw yet
          </p>
        ) : (
          <ChartLoader visible={!wiped} />
        )}
        {landed && dot && (
          <span
            aria-hidden="true"
            style={{ left: dot.x - 7, top: dot.y - 7 }}
            className="pointer-events-none absolute flex size-3.5 items-center justify-center"
          >
            <span className="bg-mark absolute inline-flex size-full animate-ping rounded-full opacity-50" />
            <span className="bg-mark relative block size-3 rounded-full border-2 border-white dark:border-[#1a1a1a]" />
          </span>
        )}
        {tip && (
          <div
            style={{ left: Math.max(0, Math.min(tip.x + 16, tip.width - TOOLTIP_WIDTH)), top: Math.max(tip.y - 24, 0) }}
            className="pointer-events-none absolute z-10"
          >
            <ChartTooltip title={tip.title} rows={tip.rows} footer={tip.footer} />
          </div>
        )}
      </div>
    </div>
  )
}
