import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { StepStage } from "@/components/Onboarding/StepStage"

const matches = (reduced: boolean) =>
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))

beforeEach(() => matches(true))
afterEach(() => vi.unstubAllGlobals())

describe("StepStage", () => {
  it("shows the step it is given", () => {
    render(<StepStage step={2}>{(shown) => <p>step {shown}</p>}</StepStage>)
    expect(screen.getByText("step 2")).toBeInTheDocument()
  })

  it("changes the step at once for someone who has asked for less motion", () => {
    const { rerender } = render(<StepStage step={0}>{(shown) => <p>step {shown}</p>}</StepStage>)
    rerender(<StepStage step={1}>{(shown) => <p>step {shown}</p>}</StepStage>)
    expect(screen.getByText("step 1")).toBeInTheDocument()
  })

  it("keeps the step that is leaving on show, and out of reach, until it has gone", () => {
    matches(false)
    const { rerender, container } = render(<StepStage step={0}>{(shown) => <p>step {shown}</p>}</StepStage>)
    rerender(<StepStage step={1}>{(shown) => <p>step {shown}</p>}</StepStage>)
    expect(screen.getByText("step 0")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveProperty("inert", true)
  })
})
