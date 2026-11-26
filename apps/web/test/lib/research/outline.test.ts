import { describe, expect, it } from "vitest"

import { SECTION_IDS as appSections, sectionTitle } from "../../../../api/src/features/research/report-outline"
import { blockLink, SECTION_IDS, sectionNumber } from "@/lib/research/outline"

describe("the parts of the report", () => {
  it("are the same, in the same order, as the notebook's, so a number is the same number in both", () => {
    expect([...SECTION_IDS]).toEqual([...appSections])
    for (const id of SECTION_IDS) expect(sectionTitle(id).startsWith(`${sectionNumber(id)} · `)).toBe(true)
  })
})

describe("a link to a part of the notebook", () => {
  const notebook = "https://app.sandwormlab.xyz/workspace/w/documents/d/notebook/edit"

  it("names the block, for the notebook to scroll to", () => {
    expect(blockLink(notebook, "blk 1")).toBe(`${notebook}?block=blk%201`)
    expect(blockLink(`${notebook}?tab=1`, "b")).toBe(`${notebook}?tab=1&block=b`)
  })

  it("opens the notebook itself when the part has no block", () => {
    expect(blockLink(notebook, undefined)).toBe(notebook)
  })
})
