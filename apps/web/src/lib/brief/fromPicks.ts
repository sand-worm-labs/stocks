export function briefFromPicks(labels: string[]) {
  const list = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : (labels[0] ?? "")
  return `Grow 500 USDC over 3+ years. Include ${list}.`
}
