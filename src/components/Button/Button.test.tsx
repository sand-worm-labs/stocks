import { describe, expect, it } from "vitest"

import { buttonVariants } from "./Button"

describe("buttonVariants", () => {
  it("applies the intent and size it is given", () => {
    const classes = buttonVariants({ intent: "secondary", size: "sm" })
    expect(classes).toContain("text-primary")
    expect(classes).toContain("min-w-20")
  })

  it("is the large primary button unless told otherwise", () => {
    const classes = buttonVariants()
    expect(classes).toContain("bg-primary")
    expect(classes).toContain("min-w-32")
  })
})
