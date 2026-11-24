"use client"

import { PiPlay } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"

import { TOUR_EVENT } from "./ProductTour"

// Starts the guided tour again from its first step
export function ReplayTourButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}
      className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 gap-1.5 px-3" })}
    >
      Replay
      <PiPlay aria-hidden="true" />
    </button>
  )
}
