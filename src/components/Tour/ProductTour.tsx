"use client"

import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { PiArrowRight, PiCircleNotch } from "react-icons/pi"

import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import {
  BUTTON,
  CARD_WIDTH,
  EASE,
  GAP,
  HEADER,
  LEAVE,
  MARGIN,
  MOVE,
  OPEN_TIMEOUT,
  PAD,
  PROGRESS_KEY,
  ROOM,
  TOUR_EVENT,
} from "@/constants/components/tour/product-tour"
import { useMounted } from "@/hooks/use-mounted"
import { dismissWelcome } from "@/lib/onboarding/actions"
import { cn } from "@/lib/utils"

import { CHAPTERS, TOUR_STEPS, type TourStep } from "./steps"

type Rect = { top: number; left: number; width: number; height: number }

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high))
const sameRect = (a?: Rect, b?: Rect) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height)

const staysPut = (element: HTMLElement) => {
  for (let one: HTMLElement | null = element; one; one = one.parentElement) {
    const { position } = getComputedStyle(one)
    if (position === "fixed" || position === "sticky") return true
  }
  return false
}

function useTargetRect(name: string | undefined, smooth: boolean) {
  const [rect, setRect] = useState<Rect>()

  useEffect(() => {
    if (!name) return
    let frame = 0
    let scrolled = false
    const read = () => {
      const element = [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].find((one) => {
        const { width, height } = one.getBoundingClientRect()
        return width > 0 && height > 0
      })
      const found = element?.getBoundingClientRect()
      if (element && found && !scrolled) {
        scrolled = true
        const wanted = HEADER + 16
        // One too tall to leave room under it is shown from its top, and only moved if it isn't already near the top half
        const tall = found.height > window.innerHeight - HEADER - ROOM - 24
        const off = tall
          ? found.top < HEADER || found.top > window.innerHeight * 0.6
          : Math.abs(found.top - wanted) > 24
        if (off && !staysPut(element)) {
          window.scrollBy({ top: found.top - wanted, behavior: smooth ? "smooth" : "auto" })
        }
      }
      const next = found && { top: found.top, left: found.left, width: found.width, height: found.height }
      setRect((previous) => (sameRect(previous, next) ? previous : next))
      frame = requestAnimationFrame(read)
    }
    read()
    return () => cancelAnimationFrame(frame)
  }, [name, smooth])

  return name ? rect : undefined
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const read = () => setReduced(query.matches)
    read()
    query.addEventListener("change", read)
    return () => query.removeEventListener("change", read)
  }, [])
  return reduced
}

function useViewport() {
  const [size, setSize] = useState({ width: 1024, height: 768 })
  useEffect(() => {
    const read = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    read()
    window.addEventListener("resize", read)
    return () => window.removeEventListener("resize", read)
  }, [])
  return size
}

function useHeight() {
  const [height, setHeight] = useState<number>()
  const observer = useRef<ResizeObserver>(null)
  const ref = useCallback((element: HTMLDivElement | null) => {
    observer.current?.disconnect()
    if (!element) return
    observer.current = new ResizeObserver(([entry]) => setHeight(Math.ceil(entry?.borderBoxSize[0]?.blockSize ?? 0)))
    observer.current.observe(element)
  }, [])
  return [height, ref] as const
}

function Dots({ chapter }: { chapter: number }) {
  return (
    <ol
      aria-label={`${CHAPTERS[chapter]}, part ${chapter + 1} of ${CHAPTERS.length}`}
      className="flex items-center gap-1.5"
    >
      {CHAPTERS.map((name, i) => (
        <li
          key={name}
          aria-current={i === chapter ? "step" : undefined}
          style={{ transition: `width 400ms ${EASE}, background-color 300ms` }}
          className={cn(
            "h-1.5 rounded-full",
            i === chapter ? "bg-brand w-7" : i < chapter ? "bg-brand/40 w-1.5" : "bg-border-tertiary w-1.5"
          )}
        />
      ))}
    </ol>
  )
}

type Side = "top" | "bottom" | "left" | "right" | "none"
function place(rect: Rect | undefined, width: number, height: number, view: { width: number; height: number }) {
  if (!rect) {
    return {
      x: (view.width - width) / 2,
      y: Math.max(MARGIN, (view.height - height) / 2),
      side: "none" as Side,
      arrow: 0,
    }
  }
  const centreX = rect.left + rect.width / 2
  const centreY = rect.top + rect.height / 2
  const x = clamp(centreX - width / 2, MARGIN, view.width - width - MARGIN)
  const y = clamp(centreY - height / 2, MARGIN, view.height - height - MARGIN)

  const below = rect.top + rect.height + PAD + GAP
  if (below + height + MARGIN <= view.height)
    return { x, y: below, side: "top" as Side, arrow: clamp(centreX - x, 28, width - 28) }
  const above = rect.top - PAD - GAP - height
  if (above >= MARGIN) return { x, y: above, side: "bottom" as Side, arrow: clamp(centreX - x, 28, width - 28) }
  const right = rect.left + rect.width + PAD + GAP
  if (right + width + MARGIN <= view.width)
    return { x: right, y, side: "left" as Side, arrow: clamp(centreY - y, 28, height - 28) }
  const left = rect.left - PAD - GAP - width
  if (left >= MARGIN) return { x: left, y, side: "right" as Side, arrow: clamp(centreY - y, 28, height - 28) }
  return { x, y: view.height - height - MARGIN, side: "none" as Side, arrow: 0 }
}

function TourView({
  step,
  index,
  total,
  closing,
  busy,
  onBack,
  onNext,
  onSkip,
}: {
  step: TourStep
  index: number
  total: number
  closing: boolean
  busy: boolean
  onBack: () => void
  onNext: () => void
  onSkip: () => void
}) {
  const viewport = useViewport()
  const reduced = useReducedMotion()
  const move = reduced ? 0 : MOVE
  const rect = useTargetRect(step.target, !reduced)
  const [height, measure] = useHeight()
  const card = useRef<HTMLDivElement>(null)
  const last = index === total - 1

  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (height === undefined || settled) return
    const frame = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(frame)
  }, [height, settled])

  useEffect(() => card.current?.focus({ preventScroll: true }), [index])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip()
      else if (event.key === "Enter" && document.activeElement === card.current) onNext()
      else if (event.key === "ArrowRight" && !last) onNext()
      else if (event.key === "ArrowLeft" && index > 0) onBack()
      else if (event.key === "Tab") {
        const buttons = [...(card.current?.querySelectorAll<HTMLElement>("button") ?? [])]
        const first = buttons[0]
        const end = buttons.at(-1)
        if (!first || !end) return
        const atStart = event.shiftKey && document.activeElement === first
        const atEnd = !event.shiftKey && document.activeElement === end
        if (atStart || atEnd) {
          event.preventDefault()
          ;(atStart ? end : first).focus()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [index, last, onBack, onNext, onSkip])

  const width = Math.min(CARD_WIDTH, viewport.width - MARGIN * 2)
  const { x, y, side, arrow } = place(rect, width, height ?? 0, viewport)

  const lit: Rect = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : { top: viewport.height / 2, left: viewport.width / 2, width: 0, height: 0 }
  const glide = (properties: string[]) =>
    settled && move > 0 ? properties.map((p) => `${p} ${move}ms ${EASE}`).join(", ") : "none"

  return (
    <div
      className="font-body fixed inset-0 z-[70]"
      style={{ opacity: closing ? 0 : 1, transition: `opacity ${LEAVE}ms ease-out` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 backdrop-blur-[3px]"
        style={{ opacity: rect ? 0 : 1, transition: "opacity 450ms ease" }}
      />
      <div
        aria-hidden="true"
        className="absolute rounded-xl"
        style={{
          ...lit,
          boxShadow: `0 0 0 2px rgb(255 255 255 / ${rect ? 0.55 : 0}), 0 0 0 100vmax rgb(8 8 12 / 0.58)`,
          transition:
            settled && move > 0
              ? `${["top", "left", "width", "height"].map((p) => `${p} ${move}ms ${EASE}`).join(", ")}, box-shadow 350ms ease`
              : "none",
        }}
      />

      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        className="absolute top-0 left-0 outline-none"
        style={{
          width,
          opacity: height === undefined ? 0 : 1,
          transform: `translate3d(${x}px, ${y}px, 0)`,
          transition: glide(["transform"]),
        }}
      >
        <div className="animate-fade-up bg-block-surface border-border-secondary dark:border-border-tertiary relative rounded-[28px] border shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          {(["top", "bottom", "left", "right"] as const).map((edge) => {
            const horizontal = edge === "top" || edge === "bottom"
            return (
              <span
                key={edge}
                aria-hidden="true"
                className={cn(
                  "bg-block-surface border-border-secondary dark:border-border-tertiary absolute size-3 rotate-45",
                  edge === "top" && "-top-1.5 border-t border-l",
                  edge === "bottom" && "-bottom-1.5 border-r border-b",
                  edge === "left" && "-left-1.5 border-b border-l",
                  edge === "right" && "-right-1.5 border-t border-r"
                )}
                style={{
                  [horizontal ? "left" : "top"]: arrow - 6,
                  opacity: rect && side === edge ? 1 : 0,
                  transition:
                    settled && move > 0
                      ? `${horizontal ? "left" : "top"} ${move}ms ${EASE}, opacity 250ms ease`
                      : "none",
                }}
              />
            )
          })}

          <div
            className="overflow-hidden rounded-[28px]"
            style={{ height, transition: settled && move > 0 ? `height ${move}ms ${EASE}` : "none" }}
          >
            <div ref={measure}>
              <div key={step.id} className="animate-fade-up px-7 pt-7">
                {step.mark && (
                  <span className="mb-4 block">
                    <SandwormLogo size={44} />
                  </span>
                )}
                {!step.mark && (
                  <p className="text-ink-400 mb-1.5 text-xs font-medium tracking-wide uppercase">
                    {CHAPTERS[step.chapter]} · {index + 1} of {total}
                  </p>
                )}
                <h2 id="tour-title" className="text-ink-100 text-[19px] leading-6 font-normal tracking-tight">
                  {step.title}
                </h2>
                <div id="tour-text" className="text-ink-400 mt-1.5 flex flex-col gap-3 text-[15px] leading-6">
                  {step.text.split("\n\n").map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {step.more && (
                    <a
                      href={step.more.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent dark:text-primary w-fit font-medium hover:underline"
                    >
                      {step.more.label} ↗
                    </a>
                  )}
                </div>
                {step.visual}
              </div>

              <div className="flex items-center justify-between gap-3 px-7 pt-6 pb-6">
                <Dots chapter={step.chapter} />
                <div className="flex items-center gap-2">
                  {!last && (
                    <button
                      type="button"
                      onClick={onSkip}
                      className={cn(BUTTON, "text-ink-100 hover:text-ink-400 px-3")}
                    >
                      Skip
                    </button>
                  )}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={onBack}
                      disabled={busy}
                      className={cn(BUTTON, "border-border-tertiary text-ink-100 hover:bg-hover-bg border")}
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onNext}
                    aria-busy={busy}
                    className={cn(BUTTON, "bg-base-400 px-5 text-white hover:opacity-85 dark:bg-white dark:text-black")}
                  >
                    {busy ? "Opening" : last ? (step.action?.label ?? "Done") : "Next"}
                    {busy ? (
                      <PiCircleNotch aria-hidden="true" size={16} className="animate-spin" />
                    ) : (
                      <PiArrowRight aria-hidden="true" size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function savedStep() {
  if (typeof window === "undefined") return 0
  const saved = Number(window.sessionStorage.getItem(PROGRESS_KEY))
  return Number.isInteger(saved) && saved > 0 && saved < TOUR_STEPS.length ? saved : 0
}

export function ProductTour({ initiallyOpen }: { initiallyOpen: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(initiallyOpen)
  const [index, setIndex] = useState(savedStep)
  const [pending, setPending] = useState<number | null>(null)
  const [closing, setClosing] = useState(false)
  const mounted = useMounted()

  useEffect(() => {
    const start = () => {
      setIndex(0)
      setPending(null)
      setClosing(false)
      setOpen(true)
    }
    window.addEventListener(TOUR_EVENT, start)
    return () => window.removeEventListener(TOUR_EVENT, start)
  }, [])

  useEffect(() => {
    if (open) window.sessionStorage.setItem(PROGRESS_KEY, String(index))
  }, [open, index])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const finish = useCallback(
    (to?: string) => {
      void dismissWelcome()
      window.sessionStorage.removeItem(PROGRESS_KEY)
      setClosing(true)
      window.setTimeout(() => {
        setOpen(false)
        setClosing(false)
        setPending(null)
        if (to) router.push(to)
      }, LEAVE)
    },
    [router]
  )

  const goTo = useCallback(
    (to: number) => {
      const next = TOUR_STEPS[to]
      if (!next) return
      if (next.route && next.route !== pathname) {
        setPending(to)
        router.push(next.route)
      } else {
        setPending(null)
        setIndex(to)
      }
    },
    [pathname, router]
  )

  if (pending !== null && TOUR_STEPS[pending]?.route === pathname) {
    setIndex(pending)
    setPending(null)
  }

  useEffect(() => {
    if (pending === null) return
    const timer = window.setTimeout(() => {
      setIndex(pending)
      setPending(null)
    }, OPEN_TIMEOUT)
    return () => window.clearTimeout(timer)
  }, [pathname, pending])

  const step = TOUR_STEPS[index]
  const busy = pending !== null
  const onNext = useCallback(() => {
    if (busy) return
    if (index < TOUR_STEPS.length - 1) goTo(index + 1)
    else finish(step?.action?.href)
  }, [busy, finish, goTo, index, step])
  const onBack = useCallback(() => {
    if (!busy) goTo(Math.max(index - 1, 0))
  }, [busy, goTo, index])
  const onSkip = useCallback(() => finish(), [finish])

  if (!open || !mounted || !step) return null

  return createPortal(
    <TourView
      step={step}
      index={index}
      total={TOUR_STEPS.length}
      closing={closing}
      busy={busy}
      onBack={onBack}
      onNext={onNext}
      onSkip={onSkip}
    />,
    document.body
  )
}
