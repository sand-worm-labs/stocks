// Percentages and USDC amounts: the figures a line is about
const FIGURE = /([+−-]?\d[\d,.]*%|\d[\d,.]*\s?USDC)/

export function splitFigures(text: string) {
  return text.split(FIGURE).map((part, i) => ({ text: part, figure: i % 2 === 1 }))
}
