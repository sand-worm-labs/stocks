// The idea that stands for a pick made in the stock picker, in words the brief reader understands: what was picked becomes what to
// include, and the rest is left to be assumed.
export function briefFromPicks(labels: string[]) {
  const list = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : (labels[0] ?? "")
  return `Grow 500 USDC over 3+ years. Include ${list}.`
}
