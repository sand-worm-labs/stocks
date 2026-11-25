"use client"

import {
  AreaSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  LineSeries,
  LineStyle,
  type MouseEventParams,
  TickMarkType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts"
import { useTheme } from "next-themes"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { BenchmarkPicker } from "@/components/Charts/BenchmarkPicker"
import { ChartLoader } from "@/components/Charts/ChartLoader"
import { ChartTooltip, type TooltipRow } from "@/components/Charts/ChartTooltip"
import { ChipSlot } from "@/components/Charts/ChipSlot"
import { drawFund, type Fund } from "@/components/Charts/fund-line"
import { Pill } from "@/components/ui/pill"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { HEIGHT, TOOLTIP_WIDTH } from "@/constants/components/charts/trading-chart"
import { useComparedFunds } from "@/hooks/use-compared-funds"
import { useInView } from "@/hooks/use-in-view"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import type { BenchmarkLine } from "@/lib/benchmarks/compare"
import {
  ACCENT,
  formats,
  formatSignedPercentPoints,
  FUND_MS,
  isoOf,
  LINE_COLORS,
  markerTimes,
  MAX_COMPARED,
  percent,
  plotted,
  REVEAL_MS,
  risingTimes,
  type View,
  VIEWS,
  withAlpha,
} from "@/lib/charts/trading"
import { formatDay, formatTime } from "@/lib/dates"
import { formatAmount, formatPercent, formatSignedAmount } from "@/lib/format"
import type { ChartEvent } from "@/lib/portfolios/chart"
import { changeOver, type ValuePoint } from "@/lib/portfolios/performance"

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

type Tip = { x: number; y: number; width: number; title: string; rows: TooltipRow[]; footer?: string }

type TradingChartProps = {
  points: ValuePoint[]
  lines: BenchmarkLine[]
  label: string
  name?: string
  events?: ChartEvent[]
}

export function TradingChart({ points, lines, label, name = "Strategy", events = [] }: TradingChartProps) {
  const { resolvedTheme } = useTheme()
  const reduced = usePrefersReducedMotion()
  const [frame, inView] = useInView<HTMLDivElement>()
  const canvas = useRef<HTMLDivElement>(null)
  const { picked, chips, toggle } = useComparedFunds(lines.map(({ id }) => id))
  const [view, setView] = useState<View>("value")
  const [tip, setTip] = useState<Tip>()
  const [dot, setDot] = useState<{ x: number; y: number }>()
  const [wiped, setWiped] = useState(false)
  const [landed, setLanded] = useState(false)

  const times = useMemo(() => risingTimes(points.map(({ time }) => time)), [points])

  const chart = useRef<IChartApi>(undefined)
  const area = useRef<ISeriesApi<"Area">>(undefined)
  const funds = useRef(new Map<string, Fund>())
  // Set when the chart has just been made, so the funds already picked are drawn at once and only a change after it is animated
  const fresh = useRef(true)
  // What the chart's callbacks should see, since they outlive a render
  const latest = useRef({ points, times, lines, name, view, events })
  const markers = useRef<ISeriesMarkersPluginApi<Time>>(undefined)
  const accentColor = useRef<string>(ACCENT.light.line)
  // A line is drawn once there are two points to draw; more points arriving after that don't make the chart again
  const ready = points.length >= 2

  const colorOf = (id: string) => picked.find((slot) => slot.id === id)?.color ?? LINE_COLORS[0] ?? "#64748b"
  const colorOfRef = useRef(colorOf)

  const markersFor = () => {
    const { times: at, events: happened } = latest.current
    return markerTimes(at, happened).map((time) => ({
      time,
      position: "belowBar" as const,
      shape: "circle" as const,
      color: accentColor.current,
      size: 1,
      text: happened.length === 1 ? "Started" : "",
    }))
  }

  const paint = () => {
    const { points: all, times: at, lines: known, view: shown } = latest.current
    const base = all[0]?.value ?? 0
    area.current?.setData(
      all.map((point, i) => ({ time: at[i] as UTCTimestamp, value: plotted(point.value, base, shown) }))
    )
    funds.current.forEach((fund, id) => drawFund(fund, known.find((line) => line.id === id)?.values, at, shown, base))
    markers.current?.setMarkers(markersFor())
  }
  const paintRef = useRef(paint)

  const placeDot = () => {
    const { points: all, times: at } = latest.current
    const x = chart.current?.timeScale().timeToCoordinate(at.at(-1) as UTCTimestamp)
    const { view: shown } = latest.current
    const y = area.current?.priceToCoordinate(plotted(all.at(-1)?.value ?? 0, all[0]?.value ?? 0, shown))
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

  // What the chart's callbacks should see is brought up to date after each drawing, before any effect runs
  useLayoutEffect(() => {
    latest.current = { points, times, lines, name, view, events }
    colorOfRef.current = colorOf
    paintRef.current = paint
    placeDotRef.current = placeDot
  })

  useEffect(() => {
    const host = canvas.current
    if (!host || !inView || !ready) return

    const dark = resolvedTheme === "dark"
    const accent = dark ? ACCENT.dark : ACCENT.light
    accentColor.current = accent.line
    const biggest = Math.max(...latest.current.points.map(({ value }) => value))
    const shape = formats(latest.current.view, biggest)
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
        priceFormatter: shape.axis,
        timeFormatter: (time: Time) => `${formatDay(isoOf(time))}, ${formatTime(isoOf(time))}`,
      },
    })
    const portfolio = api.addSeries(AreaSeries, {
      lineColor: accent.line,
      lineWidth: 3,
      topColor: accent.top,
      bottomColor: accent.bottom,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerRadius: 5,
      priceFormat: shape.series,
    })
    chart.current = api
    area.current = portfolio
    markers.current = createSeriesMarkers(portfolio, [])
    funds.current = new Map()
    fresh.current = true
    paintRef.current()
    api.timeScale().fitContent()

    const onMove = (param: MouseEventParams<Time>) => {
      const index = param.time === undefined ? -1 : latest.current.times.indexOf(param.time as UTCTimestamp)
      const point = latest.current.points[index]
      if (!param.point || !point) return setTip(undefined)

      const { view: shown, points: all } = latest.current
      const base = all[0]?.value ?? 0
      const say = (value: number) =>
        shown === "return" ? percent(plotted(value, base, "return")) : `${formatAmount(value)} USDC`

      const rows: TooltipRow[] = [{ label: latest.current.name, value: say(point.value), color: accent.line }]
      let against: { name: string; value: number } | undefined
      funds.current.forEach(({ wanted }, id) => {
        const fund = latest.current.lines.find((line) => line.id === id)
        const value = fund?.values[index]
        if (!wanted || !fund || value === undefined) return
        rows.push({ label: fund.name, value: say(value), color: colorOfRef.current(id), dashed: true })
        against ??= { name: fund.name, value }
      })

      const gap = against
        ? shown === "return"
          ? `${formatSignedPercentPoints(plotted(point.value, base, "return") - plotted(against.value, base, "return"))} against ${against.name}`
          : `${formatSignedAmount(point.value - against.value)} USDC against ${against.name}`
        : undefined

      setTip({
        x: param.point.x,
        y: param.point.y,
        width: host.clientWidth,
        title: point.label,
        rows,
        footer: gap,
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
      markers.current = undefined
      funds.current = new Map()
      setTip(undefined)
      setDot(undefined)
      setWiped(false)
      setLanded(false)
    }
  }, [inView, resolvedTheme, ready, reduced])

  const slideFund = (id: string, to: 0 | 1, instant: boolean) => {
    const api = chart.current
    const fund = funds.current.get(id)
    if (!api || !fund) return
    if (fund.frame) cancelAnimationFrame(fund.frame)

    const render = () =>
      drawFund(
        fund,
        latest.current.lines.find((line) => line.id === id)?.values,
        latest.current.times,
        latest.current.view,
        latest.current.points[0]?.value ?? 0
      )
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

  useEffect(() => {
    const api = chart.current
    if (!api || !inView) return

    const biggest = Math.max(...latest.current.points.map(({ value }) => value))
    const shape = formats(latest.current.view, biggest)
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
          priceFormat: shape.series,
        })
        fund = { series, color, progress: instant ? 1 : 0, wanted: true }
        funds.current.set(id, fund)
      }
      const settled = fund.wanted && fund.progress === 1
      fund.wanted = true
      fund.color = color
      if (!settled) slideFund(id, 1, instant)
    }
    funds.current.forEach((fund, id) => {
      if (fund.wanted && !picked.some((slot) => slot.id === id)) {
        fund.wanted = false
        slideFund(id, 0, instant)
      }
    })
    requestAnimationFrame(() => placeDotRef.current())
  }, [inView, resolvedTheme, ready, reduced, picked])

  useEffect(() => {
    if (!chart.current) return
    paintRef.current()
    chart.current.timeScale().fitContent()
    requestAnimationFrame(() => placeDotRef.current())
  }, [points, lines, events])

  useEffect(() => {
    const api = chart.current
    if (!api) return
    const shape = formats(view, Math.max(...latest.current.points.map(({ value }) => value)))
    api.applyOptions({ localization: { priceFormatter: shape.axis } })
    area.current?.applyOptions({ priceFormat: shape.series })
    funds.current.forEach(({ series }) => series.applyOptions({ priceFormat: shape.series }))
    paintRef.current()
    api.timeScale().fitContent()
    requestAnimationFrame(() => placeDotRef.current())
  }, [view])

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
        <div className="ml-auto">
          <SegmentedControl label="What the chart shows" options={[...VIEWS]} value={view} onChange={setView} />
        </div>
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
            <span className="bg-mark dark:border-primary-tint-50 relative block size-3 rounded-full border-2 border-white" />
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
