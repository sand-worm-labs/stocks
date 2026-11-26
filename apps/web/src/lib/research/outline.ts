// The parts of the report, in the order the notebook on Sandworm has them (a copy of apps/api/src/features/research/report-outline.ts, which a test
// keeps the same). A part's number is its place in this list, so part 3 of the report is part 3 of the notebook, whichever parts a report shows.
export const SECTION_IDS = ["answer", "numbers", "growth", "checks", "drawdown", "risk", "buyable", "stocks", "sources"] as const

export type SectionId = (typeof SECTION_IDS)[number]

export const sectionNumber = (id: SectionId) => SECTION_IDS.indexOf(id) + 1

// A link to one block of the notebook. The notebook's page scrolls to the block named in `block` once the Sandworm app does; until then it opens
// the notebook at the top. A part with no block links to the notebook itself.
export const blockLink = (notebookUrl: string, blockId: string | undefined) =>
  blockId ? `${notebookUrl}${notebookUrl.includes("?") ? "&" : "?"}block=${encodeURIComponent(blockId)}` : notebookUrl
