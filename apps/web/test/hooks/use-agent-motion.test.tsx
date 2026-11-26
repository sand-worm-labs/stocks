import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useAgentMotion } from "@/hooks/use-agent-motion"

const chat = (...ids: string[]) => {
  const root = document.createElement("div")
  root.scrollTo = vi.fn() as typeof root.scrollTo
  root.innerHTML = ids.map((id) => `<div data-message data-id="${id}" data-from="agent"><div data-thinking></div><p data-block data-stream="Hello there">Hello there</p></div>`).join("")
  return root
}

describe("the agent's motion", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("shows what is in the chat when it opens at once, with nothing hidden, typed out or replayed", () => {
    const root = chat("a", "b")
    renderHook(() => useAgentMotion({ current: root }, 2))

    for (const message of root.querySelectorAll<HTMLElement>("[data-message]")) expect(message.hasAttribute("data-revealed")).toBe(true)
    expect(root.querySelector<HTMLElement>("[data-thinking]")?.style.display).toBe("none")
    // The text is whole, not typed in
    expect(root.querySelector("[data-stream]")?.textContent).toBe("Hello there")
    expect(root.scrollTo).toHaveBeenCalled()
  })

  it("does the same again when the chat is opened a second time", () => {
    const first = chat("a")
    renderHook(() => useAgentMotion({ current: first }, 1)).unmount()

    const second = chat("a")
    renderHook(() => useAgentMotion({ current: second }, 1))
    expect(second.querySelector("[data-message]")?.hasAttribute("data-revealed")).toBe(true)
  })

  it("still brings in a message added afterwards with motion, not all at once", () => {
    const root = chat("a")
    const { rerender } = renderHook(({ count }) => useAgentMotion({ current: root }, count), { initialProps: { count: 1 } })

    root.insertAdjacentHTML("beforeend", '<div data-message data-id="b" data-from="agent"><p data-block data-stream="A reply">A reply</p></div>')
    rerender({ count: 2 })

    // It is revealed by the motion as it plays, not at the moment it is added
    expect(root.querySelector('[data-id="b"]')?.hasAttribute("data-revealed")).toBe(false)
  })
})
