"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef } from "react"

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { auroraFrame } from "@/lib/onboarding/aurora"

// The picture is worked out on a grid this many rows tall and drawn up to the size of the page. It is all soft colour, so nothing is lost,
// and it is a few thousand points a frame, not a million.
const ROWS = 72

// The glow behind the onboarding steps: the aurora of the main app, a band of violet and a band of glow between two dark caps, breathing
// and rippling slowly, under fine lines that drift upward. Light and soft on the light page, as it is in the main app on the dark one.
// Still for anyone who has asked for less motion. Decorative.
//
// Made to stay smooth: the picture is worked out small, once per frame, into one buffer that is reused, the browser scales it up on
// the graphics card, and the lines move by transform alone, so the page's own work never holds them up. A hidden tab draws nothing.
export function AuroraBackdrop() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()
  const dark = useTheme().resolvedTheme === "dark"

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext("2d")
    if (!element || !context) return

    let frame = 0
    let image: ImageData | undefined
    const point = [0, 0, 0, 0]

    const draw = (seconds: number) => {
      const { clientWidth, clientHeight } = element
      if (!clientWidth || !clientHeight) return
      const columns = Math.round((ROWS * clientWidth) / clientHeight)
      if (!image || image.width !== columns) {
        element.width = columns
        element.height = ROWS
        image = context.createImageData(columns, ROWS)
      }

      const colour = auroraFrame(seconds, dark)
      const { data } = image
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < columns; x++) {
          colour((x + 0.5) / columns, (y + 0.5) / ROWS, point)
          const at = (y * columns + x) * 4
          data[at] = point[0] ?? 0
          data[at + 1] = point[1] ?? 0
          data[at + 2] = point[2] ?? 0
          data[at + 3] = (point[3] ?? 0) * 255
        }
      }
      context.putImageData(image, 0, 0)
    }

    const run = (now: number) => {
      frame = requestAnimationFrame(run)
      draw(now / 1000)
    }

    // Still: one picture, drawn again when the page changes size
    const resize = new ResizeObserver(() => draw(2))
    if (reduced) resize.observe(element)
    else frame = requestAnimationFrame(run)

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
    }
  }, [reduced, dark])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <canvas ref={canvas} className="size-full" />
      <div className="scanlines absolute inset-x-0 top-0 h-[calc(100%+4px)]" />
    </div>
  )
}
