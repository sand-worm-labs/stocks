"use client"

import { gsap } from "gsap"
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react"

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

// How long the step that is leaving takes to go, how long the next takes to arrive, and how far each slides. Going is quick and
// arriving is slower and settles, so the answer to a press is felt at once and the new step still has time to land.
const OUT_SECONDS = 0.14
const IN_SECONDS = 0.4
const SHIFT = 28

// Where the steps are shown. When the step changes, the one on show slides a little the way you are going and fades, the next takes its
// place, and slides in from that side. It is opacity and transform only, which the browser can do without the page's own work, and
// the step cannot be pressed or typed in while it is going (it is inert), so a second press cannot skip one. Without motion the step just changes.
export function StepStage({ step, children }: { step: number; children: (step: number) => ReactNode }) {
  const stage = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState(step)
  // Which way the last change went: 1 forward, -1 back
  const way = useRef(1)
  const arrived = useRef(false)

  useEffect(() => {
    const element = stage.current
    if (!element) return

    if (step === shown) {
      // Back where it was, before it had gone: bring it back rather than leave it half away
      element.inert = false
      gsap.to(element, { opacity: 1, x: 0, duration: 0.15, clearProps: "opacity,transform" })
      return () => void gsap.killTweensOf(element)
    }

    way.current = Math.sign(step - shown) || 1
    if (reduced) {
      setShown(step)
      return
    }

    element.inert = true
    gsap.to(element, {
      opacity: 0,
      x: -way.current * SHIFT * 0.5,
      duration: OUT_SECONDS,
      ease: "power2.in",
      onComplete: () => setShown(step),
    })
    return () => void gsap.killTweensOf(element)
  }, [step, shown, reduced])

  // The next step is in place, out of sight, and comes in from the side it is on
  useLayoutEffect(() => {
    const element = stage.current
    if (!element || !arrived.current) {
      arrived.current = true
      return
    }

    gsap.fromTo(
      element,
      { opacity: 0, x: way.current * SHIFT },
      {
        opacity: 1,
        x: 0,
        duration: IN_SECONDS,
        ease: "power3.out",
        clearProps: "opacity,transform",
        onStart: () => {
          element.inert = false
        },
      }
    )
    return () => void gsap.killTweensOf(element)
  }, [shown])

  return (
    <div ref={stage} className="flex w-full flex-col items-center">
      {children(shown)}
    </div>
  )
}
