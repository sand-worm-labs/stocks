"use client"

import { gsap } from "gsap"
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react"

import { IN_SECONDS, OUT_SECONDS, SHIFT } from "@/constants/components/onboarding/step-stage"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

export function StepStage({ step, children }: { step: number; children: (step: number) => ReactNode }) {
  const stage = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState(step)
  // Which way the last change went: 1 forward, -1 back
  const way = useRef(1)
  const arrived = useRef(false)

  if (reduced && shown !== step) setShown(step)

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
    if (reduced) return

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
