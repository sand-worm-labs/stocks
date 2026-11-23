"use client"

import { useRouter } from "next/navigation"
import { type PointerEvent, useEffect, useRef } from "react"

import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { routeHref } from "@/config/routes"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatAmount, formatPercent } from "@/lib/format"
import type { StockRow } from "@/lib/holdings/groups"
import { type Body, gainTint, radii, type Size, startAt, step } from "@/lib/holdings/swarm"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

const HEIGHT = 480
// Bubbles at least this wide carry the name and gain as well as the logo
const SHOW_NAME_AT = 38
// A press that moves less than this is a click, and opens the stock
const CLICK_DISTANCE = 5
// With reduced motion the swarm settles once, and is still
const SETTLE_FRAMES = 240

type Hold = { symbol: string; moved: number; lastX: number; lastY: number }

// Every stock held, with no grid and no ranking: each takes the room it needs and the others make way. Size is how much you
// hold, colour is how it is doing, and any of them can be picked up and moved. Click one to open it.
export function HoldingsSwarm({ stocks }: { stocks: StockRow[] }) {
  const router = useRouter()
  const box = useRef<HTMLDivElement>(null)
  const size = useRef<Size>({ w: 0, h: HEIGHT })
  const bodies = useRef(new Map<string, Body>())
  const nodes = useRef(new Map<string, HTMLDivElement>())
  const latest = useRef(stocks)
  const hold = useRef<Hold | null>(null)

  useEffect(() => {
    latest.current = stocks
  }, [stocks])

  useEffect(() => {
    const element = box.current
    if (!element) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const measure = () => {
      size.current = { w: element.clientWidth, h: element.clientHeight }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)

    let frame = 0
    let frames = 0
    const tick = () => {
      const current = latest.current
      const room = size.current
      if (room.w > 0) {
        const targets = radii(
          current.map(({ value }) => value),
          room
        )
        current.forEach(({ symbol }, i) => {
          if (!bodies.current.has(symbol)) {
            bodies.current.set(symbol, { ...startAt(i, room), vx: 0, vy: 0, r: 0 })
          }
        })
        for (const symbol of bodies.current.keys()) {
          if (!current.some((stock) => stock.symbol === symbol)) bodies.current.delete(symbol)
        }
        const list = current.map(({ symbol }) => bodies.current.get(symbol) as Body)
        const held = hold.current ? current.findIndex(({ symbol }) => symbol === hold.current?.symbol) : -1
        step(list, targets, room, held >= 0 ? held : undefined)
        current.forEach(({ symbol }, i) => {
          const node = nodes.current.get(symbol)
          const body = list[i]
          if (!node || !body) return
          node.style.width = node.style.height = `${body.r * 2}px`
          node.style.transform = `translate(${body.x - body.r}px, ${body.y - body.r}px)`
          node.style.opacity = body.r > 1 ? "1" : "0"
          const text = node.lastElementChild as HTMLElement | null
          if (text) text.style.display = body.r >= SHOW_NAME_AT ? "" : "none"
        })
      }
      frames++
      if (!reduced || frames < SETTLE_FRAMES) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  const open = (symbol: string) => {
    const href = routeHref("stock", undefined, symbol)
    if (href) router.push(href)
  }

  const grab = (symbol: string) => (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    hold.current = { symbol, moved: 0, lastX: event.clientX, lastY: event.clientY }
  }

  const drag = (symbol: string) => (event: PointerEvent<HTMLDivElement>) => {
    const grabbed = hold.current
    const body = bodies.current.get(symbol)
    if (!grabbed || grabbed.symbol !== symbol || !body) return
    const dx = event.clientX - grabbed.lastX
    const dy = event.clientY - grabbed.lastY
    grabbed.moved += Math.abs(dx) + Math.abs(dy)
    grabbed.lastX = event.clientX
    grabbed.lastY = event.clientY
    body.x += dx
    body.y += dy
    // Let go mid-swing and it carries on a little
    body.vx = dx * 0.6
    body.vy = dy * 0.6
  }

  const drop = (symbol: string) => () => {
    const grabbed = hold.current
    hold.current = null
    if (grabbed && grabbed.symbol === symbol && grabbed.moved < CLICK_DISTANCE) open(symbol)
  }

  return (
    <Card className="flex flex-col gap-3 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">Where it is held</h2>
        <span className="text-ink-400 text-sm">
          Size is how much you hold, colour is how it is doing. Nothing is in order. Pick one up and move it.
        </span>
      </div>
      <div
        ref={box}
        style={{ height: HEIGHT }}
        className="bg-hover-bg/50 relative w-full touch-none overflow-hidden rounded-2xl select-none dark:bg-white/[0.03]"
      >
        {stocks.map(({ symbol, name, value, gainRate }) => (
          <div
            key={symbol}
            ref={(node) => {
              if (node) nodes.current.set(symbol, node)
              else nodes.current.delete(symbol)
            }}
            role="link"
            tabIndex={0}
            aria-label={`${symbol}, ${name}: ${formatAmount(value)} USDC, ${formatPercent(gainRate, { signed: true })}`}
            title={`${name} · ${formatAmount(value)} USDC`}
            onPointerDown={grab(symbol)}
            onPointerMove={drag(symbol)}
            onPointerUp={drop(symbol)}
            onPointerCancel={() => (hold.current = null)}
            onKeyDown={(event) => event.key === "Enter" && open(symbol)}
            style={{ opacity: 0, backgroundColor: gainTint(gainRate), borderColor: gainTint(gainRate, 0.5) }}
            className="focus-visible:ring-mark/60 absolute top-0 left-0 flex cursor-grab flex-col items-center justify-center gap-0.5 rounded-full border will-change-transform focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
          >
            <StockAvatar symbol={symbol} className="pointer-events-none size-7 flex-none" />
            <span className="pointer-events-none flex flex-col items-center leading-tight">
              <span className="text-sm font-medium">{symbol}</span>
              <span className={cn("text-xs tabular-nums", TONE_TEXT_CLASSNAME[changeTone(gainRate)])}>
                {formatPercent(gainRate, { signed: true })}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
