"use client"

import { type RefObject, useEffect, useRef } from "react"
import { THINKING_MS } from "@/constants/hooks/use-agent-motion"

// Started when this file is first loaded in the browser, so the library is usually there by the time it is needed
const gsapReady = typeof window === "undefined" ? undefined : import("gsap")

const all = <T extends Element>(root: ParentNode, selector: string) => Array.from(root.querySelectorAll<T>(selector))

// What is in the chat when the page opens is just there, as it is in any chat. Only what is added after that (a reply to what the person sent)
// comes in with motion; replaying the whole conversation on every load was slow, and the same each time.
export function useAgentMotion(stream: RefObject<HTMLElement | null>, messageCount: number) {
  const hasShownFirst = useRef(false)

  useEffect(() => {
    const root = stream.current
    if (!root) return

    const pending = all<HTMLElement>(root, "[data-message]:not([data-revealed])")
    if (!pending.length) return

    const reveal = () => pending.forEach((message) => message.setAttribute("data-revealed", ""))
    const isFirst = !hasShownFirst.current
    hasShownFirst.current = true
    const isCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (isCalm || isFirst) {
      all<HTMLElement>(root, "[data-thinking]").forEach((thinking) => (thinking.style.display = "none"))
      reveal()
      root.scrollTo({ top: root.scrollHeight })
      return
    }

    let isCancelled = false
    let context: { revert: () => void } | undefined
    const streamed: [HTMLElement, string][] = []

    void (gsapReady ?? import("gsap"))
      .then(({ gsap }) => {
        if (isCancelled) return

        context = gsap.context(() => {
          const timeline = gsap.timeline({ defaults: { ease: "power3.out" } })
          const follow = () =>
            gsap.to(root, { scrollTop: root.scrollHeight, duration: 0.5, ease: "power2.out", overwrite: true })

          pending.forEach((message) => {
            gsap.set(message, { autoAlpha: 0, y: 12 })
            message.setAttribute("data-revealed", "")
            timeline.to(message, { autoAlpha: 1, y: 0, duration: 0.4 }).call(follow)
            if (message.dataset.from !== "agent") return

            const thinking = message.querySelector<HTMLElement>("[data-thinking]")
            if (thinking) {
              timeline
                .to({}, { duration: THINKING_MS })
                .to(thinking, { autoAlpha: 0, duration: 0.15 })
                .set(thinking, { display: "none" })
            }

            let previousLength = 0
            let previous = ""
            all<HTMLElement>(message, "[data-block]").forEach((block, index) => {
              const items = all(block, "[data-item]")
              const checks = all(block, "[data-check]")
              const spinners = all(block, "[data-step-state=done] [data-step-spinner]")
              const text = block.matches("[data-stream]") ? block : null
              const label = `${message.dataset.id}-block-${index}`

              gsap.set(block, { autoAlpha: 0, y: 14 })
              gsap.set(items, { autoAlpha: 0, y: 8 })
              gsap.set(checks, { scale: 0, transformOrigin: "50% 50%" })

              timeline.addLabel(label, previous ? undefined : ">-0.05")
              const start = previous ? `${previous}+=${previousLength}` : label
              timeline.to(block, { autoAlpha: 1, y: 0, duration: 0.45 }, start).call(follow)
              if (previous) timeline.addLabel(label, start)

              let length = 0.35
              if (text) {
                const full = text.dataset.stream ?? ""
                const words = full.split(" ")
                const progress = { words: 0 }
                const duration = Math.min(1.4, words.length * 0.025)
                streamed.push([text, full])
                text.textContent = ""
                timeline.to(
                  progress,
                  {
                    words: words.length,
                    duration,
                    ease: "none",
                    onUpdate: () => {
                      text.textContent = words.slice(0, Math.ceil(progress.words)).join(" ")
                    },
                    onComplete: () => {
                      text.textContent = full
                    },
                  },
                  label
                )
                length = duration * 0.7
              }

              if (items.length) {
                timeline.to(items, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.06 }, `${label}+=0.1`)
                length = 0.2 + items.length * 0.06
              }

              if (checks.length) {
                const spin = spinners.length
                  ? gsap.to(spinners, { rotation: 360, duration: 0.8, repeat: -1, ease: "none" })
                  : undefined
                if (spinners.length)
                  timeline.to(spinners, { autoAlpha: 0, duration: 0.15, stagger: 0.14 }, `${label}+=0.15`)
                timeline.to(
                  checks,
                  { scale: 1, duration: 0.35, ease: "back.out(2.2)", stagger: spinners.length ? 0.14 : 0.06 },
                  `${label}+=0.15`
                )
                if (spin) timeline.call(() => void spin.kill())
                length = Math.max(length, 0.15 + checks.length * (spinners.length ? 0.14 : 0.06))
              }

              previous = label
              previousLength = length
            })
          })

          timeline.call(follow)
        }, root)
      })
      .catch(reveal)

    return () => {
      isCancelled = true
      context?.revert()
      streamed.forEach(([element, full]) => (element.textContent = full))
    }
  }, [stream, messageCount])
}
