// The parts of a strategy's report, in order. The report in Stocks, the one notebook on Sandworm that backs it, and the instructions an agent is
// given all follow this one list, so the notebook reads as the report with its working shown: part 3 of the report is part 3 of the notebook, with
// the same name, and a link from the report goes to its block. Change the list here and nothing can drift apart.
export const REPORT_SECTIONS = [
  { id: "answer", title: "The answer", reads: "What the research found, in a line, and how sure it is." },
  { id: "numbers", title: "Key numbers", reads: "The numbers that matter most for what you asked, then the rest, each with how it was worked out." },
  { id: "growth", title: "Growth of 1 USDC", reads: "What 1 USDC put in at the start would have become, next to the S&P 500." },
  { id: "checks", title: "What the numbers say", reads: "Each result against what you asked for, in plain words. The ones to read twice come first." },
  { id: "drawdown", title: "Drop from the high", reads: "How far below its best value it was on each week, next to the S&P 500." },
  { id: "risk", title: "Where the risk sits", reads: "Which stocks the ups and downs came from, and the worst month." },
  { id: "buyable", title: "Can it be bought", reads: "How deep each stock's pool is, and how much this plan's order would move the price." },
  { id: "stocks", title: "Why these stocks", reads: "Each stock's weight and how it did on its own over the test." },
  { id: "sources", title: "Sources and method", reads: "Where the prices came from, how the test works, and what it can't tell you." },
] as const

export type SectionId = (typeof REPORT_SECTIONS)[number]["id"]

export const SECTION_IDS = REPORT_SECTIONS.map(({ id }) => id) as [SectionId, ...SectionId[]]

/// "3 · Growth of 1 USDC": how a part is named wherever it is shown, so the report and the notebook call it the same
export function sectionTitle(id: SectionId) {
  const index = REPORT_SECTIONS.findIndex((section) => section.id === id)
  return `${index + 1} · ${REPORT_SECTIONS[index]?.title}`
}

/// A link to one block of a notebook. The notebook's page scrolls to the block named in `block` (a change for the Sandworm app to make); until it
/// does, the link opens the notebook at the top, which is where the part's heading is a short scroll away.
export const blockLink = (notebookUrl: string, blockId: string | undefined) =>
  blockId ? `${notebookUrl}${notebookUrl.includes("?") ? "&" : "?"}block=${encodeURIComponent(blockId)}` : notebookUrl
